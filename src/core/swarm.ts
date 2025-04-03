import { OpenAI } from 'openai';
import { Agent } from './agent';
import { Result } from './result';
import { Message, Response, SwarmConfig, ModelProvider, TraceEvent, FunctionType } from './types';
import { Tracer } from '../tracing';
import { v4 as uuidv4 } from 'uuid';
import { getOpenAI, defaultConfig } from '../config';

// 工具调用类型定义（从OpenAI类型中提取）
interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Swarm类 - 用于编排Agent
 */
export class Swarm {
  private modelProvider: ModelProvider;
  private tracer: Tracer;
  
  constructor(options: SwarmConfig = {}) {
    // 创建默认的OpenAI提供商或使用自定义提供商
    if (options.modelProvider) {
      this.modelProvider = options.modelProvider;
    } else {
      // 使用config.ts中的getOpenAI函数获取OpenAI客户端
      const openai = getOpenAI();
      
      this.modelProvider = {
        id: 'openai',
        createChatCompletion: (opts: any) => openai.chat.completions.create(opts),
        // 简化的流处理函数，只使用非流式API
        createChatCompletionStream: async function* (opts: any): AsyncGenerator<any, void, unknown> {
          // 使用非流式API，仿流式效果
          const response = await openai.chat.completions.create(opts);
          // 模拟流响应
          yield { choices: [{ delta: { content: response.choices[0].message.content } }] };
        }
      };
    }
    
    // 初始化追踪器
    this.tracer = new Tracer(options.enableTracing ?? true);
  }
  
  /**
   * 运行Agent
   */
  async run(
    agent: Agent,
    messages: Message[],
    context_variables: Record<string, any> = {},
    stream: boolean = false,
    max_turns: number = Infinity,
    execute_tools: boolean = true,
    model_override: string | null = null,
    debug: boolean = false
  ): Promise<Response | AsyncGenerator<any, void, unknown>> {
    if (stream) {
      return this.runWithStream(agent, messages, context_variables, max_turns, execute_tools, model_override, debug);
    }
    
    // 重置追踪
    this.tracer.clear();
    
    let currentAgent = agent;
    let currentMessages = [...messages];
    let currentContextVars = { ...context_variables };
    let turns = 0;
    
    // 添加系统指令消息
    const systemInstructions = currentAgent.getInstructions(currentContextVars);
    const systemMessage: Message = {
      role: 'system',
      content: systemInstructions
    };
    
    // 记录agent启动事件
    this.tracer.addEvent('agent_start', {
      agent: currentAgent.name,
      instructions: systemInstructions.substring(0, 200) + (systemInstructions.length > 200 ? '...' : '')
    });
    
    if (debug) {
      console.log(`[DEBUG] 启动Agent: ${currentAgent.name}`);
      console.log(`[DEBUG] 指令: ${systemInstructions.substring(0, 100)}...`);
    }
    
    // 循环处理对话，直到达到最大轮数或不需要继续
    while (turns < max_turns) {
      // 验证用户输入
      for (const message of currentMessages) {
        if (message.role === 'user' && message.content) {
          const validationResult = await currentAgent.validateInput(message.content);
          if (!validationResult.valid) {
            this.tracer.addEvent('guardrail_check', {
              type: 'input_validation',
              success: false,
              errors: validationResult.errors
            });
            
            // 抛出错误或处理验证失败
            throw new Error(`输入验证失败: ${validationResult.errors.join(', ')}`);
          }
          
          this.tracer.addEvent('guardrail_check', {
            type: 'input_validation',
            success: true
          });
        }
      }
      
      // 记录模型调用事件
      this.tracer.addEvent('model_call', {
        model: model_override || currentAgent.model,
        messages: currentMessages.map(m => ({
          role: m.role,
          content: m.content ? (m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '')) : null
        }))
      });
      
      // 发送请求到模型提供商
      const response = await this.getChatCompletion(
        currentAgent,
        currentMessages,
        currentContextVars,
        model_override,
        false, // 非流式
        debug
      );
      
      // 处理响应
      const responseMessage = response.choices[0].message;
      
      // 验证模型输出
      if (responseMessage.content) {
        const validationResult = await currentAgent.validateOutput(responseMessage.content);
        if (!validationResult.valid) {
          this.tracer.addEvent('guardrail_check', {
            type: 'output_validation',
            success: false,
            errors: validationResult.errors
          });
          
          // 这里可以选择如何处理验证失败：抛出错误、修改输出、只记录等
          console.warn(`输出验证失败: ${validationResult.errors.join(', ')}`);
        } else {
          this.tracer.addEvent('guardrail_check', {
            type: 'output_validation',
            success: true
          });
        }
      }
      
      // 添加模型响应到消息历史
      currentMessages.push({
        role: 'assistant',
        content: responseMessage.content,
        tool_calls: responseMessage.tool_calls
      });
      
      // 处理工具调用
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0 && execute_tools) {
        turns++;
        
        // 使用新的handleToolCalls方法处理工具调用
        const toolCallResult = await this.handleToolCalls(
          responseMessage.tool_calls,
          currentAgent.functions,
          currentContextVars,
          debug
        );
        
        // 添加工具响应消息到历史
        currentMessages = [...currentMessages, ...toolCallResult.messages];
        
        // 更新上下文变量
        currentContextVars = {
          ...currentContextVars,
          ...toolCallResult.context_variables
        };
        
        // 处理可能的Agent切换
        if (toolCallResult.agent) {
          this.tracer.addEvent('handoff', {
            from: currentAgent.name,
            to: toolCallResult.agent.name,
            context_update: toolCallResult.context_variables
          });
          
          currentAgent = toolCallResult.agent;
          
          if (debug) {
            this.debugPrint(debug, `Agent切换到: ${currentAgent.name}`);
          }
        } else {
          // 如果没有工具调用或不需要执行，跳出循环
          break;
        }
      } else {
        // 如果没有工具调用或不需要执行，跳出循环
        break;
      }
    }
    
    // 记录agent结束事件
    this.tracer.addEvent('agent_end', {
      agent: currentAgent.name
    });
    
    // 返回最终结果
    return {
      messages: currentMessages,
      agent: currentAgent,
      context_variables: currentContextVars,
      trace: this.tracer.getEvents()
    };
  }
  
  /**
   * 使用流式响应运行Agent
   */
  private async *runWithStream(
    agent: Agent,
    messages: Message[],
    context_variables: Record<string, any> = {},
    max_turns: number = Infinity,
    execute_tools: boolean = true,
    model_override: string | null = null,
    debug: boolean = false
  ): AsyncGenerator<any, void, unknown> {
    // 重置追踪
    this.tracer.clear();
    
    let currentAgent = agent;
    let currentMessages = [...messages];
    let currentContextVars = { ...context_variables };
    let turns = 0;
    
    // 添加系统指令消息
    const systemInstructions = currentAgent.getInstructions(currentContextVars);
    const systemMessage: Message = {
      role: 'system',
      content: systemInstructions
    };
    
    // 记录agent启动事件
    this.tracer.addEvent('agent_start', {
      agent: currentAgent.name,
      instructions: systemInstructions.substring(0, 200) + (systemInstructions.length > 200 ? '...' : '')
    });
    
    if (debug) {
      console.log(`[DEBUG] 启动Agent: ${currentAgent.name}`);
      console.log(`[DEBUG] 指令: ${systemInstructions.substring(0, 100)}...`);
    }
    
    // 循环处理对话，直到达到最大轮数或不需要继续
    while (turns < max_turns) {
      // 验证用户输入
      for (const message of currentMessages) {
        if (message.role === 'user' && message.content) {
          const validationResult = await currentAgent.validateInput(message.content);
          if (!validationResult.valid) {
            this.tracer.addEvent('guardrail_check', {
              type: 'input_validation',
              success: false,
              errors: validationResult.errors
            });
            
            // 抛出错误或处理验证失败
            throw new Error(`输入验证失败: ${validationResult.errors.join(', ')}`);
          }
          
          this.tracer.addEvent('guardrail_check', {
            type: 'input_validation',
            success: true
          });
        }
      }
      
      turns++;
      
      // 记录流式开始
      yield {
        type: 'stream_start',
        agent: currentAgent.name
      };
      
      try {
        // 记录模型调用事件
        this.tracer.addEvent('model_call', {
          model: model_override || currentAgent.model,
          messages: currentMessages.map(m => ({
            role: m.role,
            content: m.content ? (m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '')) : null
          }))
        });
        
        // 发送流式请求到模型提供商
        const stream = await this.getChatCompletion(
          currentAgent,
          currentMessages,
          currentContextVars,
          model_override,
          true, // 流式请求
          debug
        );
        
        // 收集完整的流式响应
        let collectedResponseMessage: Record<string, any> = {
          content: '',
          tool_calls: []
        };
        let lastChunkHadToolCalls = false;
        
        // 处理流式响应
        for await (const chunk of stream) {
          const delta = chunk.choices[0].delta;
          
          // 收集完整的内容
          if (delta.content) {
            collectedResponseMessage.content += delta.content;
            
            yield {
              type: 'content',
              content: delta.content
            };
          }
          
          // 收集工具调用
          if (delta.tool_calls && delta.tool_calls.length > 0) {
            lastChunkHadToolCalls = true;
            
            // 处理不同的工具调用增量
            for (const toolCallDelta of delta.tool_calls) {
              const toolCallIndex = toolCallDelta.index;
              
              // 确保数组有足够空间
              while (collectedResponseMessage.tool_calls.length <= toolCallIndex) {
                collectedResponseMessage.tool_calls.push({
                  id: '',
                  type: '',
                  function: { name: '', arguments: '' }
                });
              }
              
              // 更新工具调用数据
              const currentToolCall = collectedResponseMessage.tool_calls[toolCallIndex];
              
              if (toolCallDelta.id) {
                currentToolCall.id = toolCallDelta.id;
              }
              
              if (toolCallDelta.type) {
                currentToolCall.type = toolCallDelta.type;
              }
              
              if (toolCallDelta.function) {
                if (toolCallDelta.function.name) {
                  currentToolCall.function.name = toolCallDelta.function.name;
                }
                
                if (toolCallDelta.function.arguments) {
                  currentToolCall.function.arguments += toolCallDelta.function.arguments;
                }
              }
              
              // 仅当有函数名时才发送工具调用增量
              if (currentToolCall.function.name) {
                yield {
                  type: 'tool_call',
                  tool_call: { ...currentToolCall }
                };
              }
            }
          }
        }
        
        // 添加模型响应到消息历史
        currentMessages.push({
          role: 'assistant',
          content: collectedResponseMessage.content,
          tool_calls: collectedResponseMessage.tool_calls
        });
        
        yield {
          type: 'stream_end',
          messages: currentMessages
        };
        
        // 验证模型输出
        if (collectedResponseMessage.content) {
          const validationResult = await currentAgent.validateOutput(collectedResponseMessage.content);
          if (!validationResult.valid) {
            this.tracer.addEvent('guardrail_check', {
              type: 'output_validation',
              success: false,
              errors: validationResult.errors
            });
            
            // 这里可以选择如何处理验证失败：抛出错误、修改输出、只记录等
            if (debug) {
              console.warn(`输出验证失败: ${validationResult.errors.join(', ')}`);
            }
            
            yield {
              type: 'validation_failed',
              errors: validationResult.errors
            };
          } else {
            this.tracer.addEvent('guardrail_check', {
              type: 'output_validation',
              success: true
            });
          }
        }
        
        // 处理工具调用
        if (collectedResponseMessage.tool_calls && 
            collectedResponseMessage.tool_calls.length > 0 && 
            execute_tools) {
          
          // 使用新的handleToolCalls方法处理工具调用
          const toolCallResult = await this.handleToolCalls(
            collectedResponseMessage.tool_calls,
            currentAgent.functions,
            currentContextVars,
            debug
          );
          
          // 添加工具响应消息到历史
          currentMessages = [...currentMessages, ...toolCallResult.messages];
          
          for (const message of toolCallResult.messages) {
            yield {
              type: 'tool_response',
              message
            };
          }
          
          // 更新上下文变量
          currentContextVars = {
            ...currentContextVars,
            ...toolCallResult.context_variables
          };
          
          // 处理可能的Agent切换
          if (toolCallResult.agent) {
            this.tracer.addEvent('handoff', {
              from: currentAgent.name,
              to: toolCallResult.agent.name,
              context_update: toolCallResult.context_variables
            });
            
            currentAgent = toolCallResult.agent;
            
            yield {
              type: 'handoff',
              from: agent.name,
              to: currentAgent.name
            };
            
            if (debug) {
              this.debugPrint(debug, `Agent切换到: ${currentAgent.name}`);
            }
            
            // 继续下一个循环
            continue;
          }
        }
        
        // 如果没有工具调用或不需要执行，结束循环
        break;
      } catch (error) {
        if (debug) {
          console.error('[DEBUG] 流式运行错误:', error);
        }
        yield {
          type: 'error',
          error: String(error)
        };
        break;
      }
    }
    
    // 记录agent结束事件
    this.tracer.addEvent('agent_end', {
      agent: currentAgent.name
    });
    
    yield {
      type: 'complete',
      messages: currentMessages,
      agent: currentAgent,
      context_variables: currentContextVars,
      trace: this.tracer.getEvents()
    };
  }
  
  /**
   * 处理LLM返回的工具调用
   */
  private async handleToolCalls(
    toolCalls: ToolCall[],
    functions: FunctionType[],
    contextVariables: Record<string, any>,
    debug: boolean = false
  ): Promise<{
    messages: Message[];
    agent: Agent | null;
    context_variables: Record<string, any>;
  }> {
    // 创建函数映射
    const functionMap: Record<string, Function> = {};
    
    // 过滤出实际函数并创建映射
    for (const func of functions) {
      if (typeof func === 'function') {
        functionMap[func.name] = func;
      }
    }
    
    const response = {
      messages: [] as Message[],
      agent: null as Agent | null,
      context_variables: {} as Record<string, any>
    };
    
    for (const toolCall of toolCalls) {
      if (toolCall.type === 'function') {
        const { name, arguments: args } = toolCall.function;
        const toolCallId = toolCall.id; // 保存工具调用ID
        
        this.tracer.addEvent('function_call', {
          name,
          arguments: args
        });
        
        if (debug) {
          this.debugPrint(debug, `调用函数: ${name} 参数: ${args}`);
        }
        
        // 查找函数
        const func = functionMap[name];
        
        if (func) {
          try {
            // 解析参数
            const parsedArgs = JSON.parse(args);
            
            // 执行函数，传入上下文变量和参数
            const funcResult = func(contextVariables, ...Object.values(parsedArgs));
            
            this.tracer.addEvent('function_return', {
              name,
              result: this.serializeResult(funcResult)
            });
            
            // 处理函数返回结果
            const result = this.handleFunctionResult(funcResult, name, toolCallId, debug);
            
            // 添加消息
            if (result.message) {
              response.messages.push(result.message);
            }
            
            // 更新上下文变量
            response.context_variables = {
              ...response.context_variables,
              ...result.context_variables
            };
            
            // 设置Agent（如果有）
            if (result.agent) {
              response.agent = result.agent;
            }
          } catch (error) {
            // Safely convert error to string
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.tracer.addEvent('function_return', {
              name,
              error: errorMessage
            });
            
            if (debug) {
              this.debugPrint(debug, `函数 ${name} 执行错误: ${errorMessage}`);
            }
            
            response.messages.push({
              role: 'tool',
              content: `函数 ${name} 执行错误: ${errorMessage}`,
              name: name,
              tool_call_id: toolCallId // 添加工具调用ID
            });
          }
        } else {
          // 未找到函数
          const errorMessage = `函数 ${name} 未找到`;
          
          this.tracer.addEvent('function_return', {
            name,
            error: errorMessage
          });
          
          if (debug) {
            this.debugPrint(debug, errorMessage);
          }
          
          response.messages.push({
            role: 'tool',
            content: errorMessage,
            name: name,
            tool_call_id: toolCallId // 添加工具调用ID
          });
        }
      }
    }
    
    return response;
  }
  
  /**
   * 处理函数返回的结果
   */
  private handleFunctionResult(
    result: any,
    funcName: string = '',
    toolCallId: string = '',
    debug: boolean = false
  ): {
    message: Message | null;
    agent: Agent | null;
    context_variables: Record<string, any>;
  } {
    if (result instanceof Result) {
      // 处理Result对象
      const message: Message = {
        role: 'tool',
        content: result.value !== undefined ? String(result.value) : '',
        name: funcName,
        tool_call_id: toolCallId // 添加工具调用ID
      };
      
      return {
        message,
        agent: result.agent || null,
        context_variables: result.context_variables || {}
      };
    } else if (result instanceof Agent) {
      // 直接返回Agent对象
      return {
        message: null,
        agent: result,
        context_variables: {}
      };
    } else {
      // 处理普通返回值
      let resultStr: string;
      
      try {
        resultStr = result !== undefined ? String(result) : '';
      } catch (error) {
        if (debug) {
          this.debugPrint(debug, `无法将结果转换为字符串: ${error}`);
        }
        throw new TypeError('函数返回值无法转换为字符串');
      }
      
      const message: Message = {
        role: 'tool',
        content: resultStr,
        name: funcName,
        tool_call_id: toolCallId // 添加工具调用ID
      };
      
      return {
        message,
        agent: null,
        context_variables: {}
      };
    }
  }
  
  /**
   * 将函数结果序列化为可安全记录的格式
   */
  private serializeResult(result: any): any {
    if (result instanceof Agent) {
      return { agent: result.name };
    } else if (result instanceof Result) {
      return {
        value: result.value,
        agent: result.agent ? result.agent.name : null,
        context_variables: result.context_variables
      };
    } else {
      return String(result);
    }
  }
  
  /**
   * 调试打印
   */
  private debugPrint(debug: boolean, message: string): void {
    if (debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  /**
   * 获取聊天补全
   * 辅助方法，用于获取模型回复
   */
  private async getChatCompletion(
    agent: Agent,
    history: Message[],
    context_variables: Record<string, any>,
    model_override: string | null,
    stream: boolean,
    debug: boolean
  ) {
    // 获取指令
    const instructions = agent.getInstructions(context_variables);
    const messages = [{ role: 'system', content: instructions }, ...history];
    
    if (debug) {
      this.debugPrint(debug, `获取聊天补全: ${JSON.stringify(messages.slice(0, 2))}`);
    }
    
    // 获取函数定义
    const tools = agent.getFunctionSchemas();
    
    // 构建请求参数
    const createParams: any = {
      model: model_override || agent.model,
      messages: messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: agent.tool_choice || undefined,
      max_tokens: agent.maxTokens
    };
    
    // 添加并行工具调用支持
    if (tools.length > 0 && agent.parallel_tool_calls !== undefined) {
      createParams.parallel_tool_calls = agent.parallel_tool_calls;
    }
    
    // 添加流支持
    if (stream) {
      createParams.stream = true;
      return this.modelProvider.createChatCompletionStream(createParams);
    }
    
    return this.modelProvider.createChatCompletion(createParams);
  }
}
