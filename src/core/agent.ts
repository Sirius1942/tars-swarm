import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, InstructionsType, FunctionType, GuardrailConfig, TraceEvent, InputValidationRule, OutputValidationRule } from './types';

/**
 * Agent类 - 代表一个LLM代理
 */
export class Agent {
  id: string;
  name: string;
  model: string;
  instructions: InstructionsType;
  functions: FunctionType[];
  tool_choice: string | null;
  guardrails: GuardrailConfig;
  traceEvents: TraceEvent[];
  maxTokens: number;
  parallel_tool_calls: boolean;
  
  constructor({
    name = "Agent",
    model = "gpt-4o",
    instructions = "You are a helpful agent.",
    functions = [],
    tool_choice = null,
    guardrails = {},
    maxTokens = 16385,
    parallel_tool_calls = true
  }: AgentConfig) {
    this.id = uuidv4();
    this.name = name;
    this.model = model;
    this.instructions = instructions;
    this.functions = functions;
    this.tool_choice = tool_choice;
    this.guardrails = guardrails;
    this.traceEvents = [];
    this.maxTokens = maxTokens;
    this.parallel_tool_calls = parallel_tool_calls;
  }

  /**
   * 获取指令文本，支持函数式指令
   */
  getInstructions(context_variables?: Record<string, any>): string {
    if (typeof this.instructions === 'function') {
      return this.instructions(context_variables);
    }
    return this.instructions;
  }

  /**
   * 为每个函数生成JSON Schema
   */
  getFunctionSchemas(): any[] {
    return this.functions.map(fn => {
      // 如果函数已经是JSON Schema格式，直接返回
      if (typeof fn !== 'function') {
        return fn;
      }
      
      // 提取函数名称
      const fnName = fn.name;
      
      // 使用Function.toString()获取函数文本
      const fnStr = fn.toString();
      
      // 简单的参数提取逻辑 - 实际应用中可能需要更复杂的解析
      const paramMatch = fnStr.match(/\(([^)]*)\)/);
      const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()).filter(p => p) : [];
      
      // 提取JSDoc注释作为描述（简化版）
      const docMatch = fnStr.match(/\/\*\*([\s\S]*?)\*\//);
      const description = docMatch ? docMatch[1].replace(/\s*\*\s*/g, ' ').trim() : '';
      
      // 构建基本的函数Schema
      return {
        type: "function",
        function: {
          name: fnName,
          description: description || `Function ${fnName}`,
          parameters: {
            type: "object",
            properties: params.reduce((acc: any, param: string) => {
              if (param !== 'context_variables') { // 排除context_variables参数
                acc[param] = { type: "string" }; // 默认假设所有参数都是字符串
              }
              return acc;
            }, {}),
            required: [] // 简化起见，不设置必需参数
          }
        }
      };
    });
  }
  
  /**
   * 验证输入内容
   */
  async validateInput(input: string): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.guardrails.inputValidation || this.guardrails.inputValidation.length === 0) {
      return { valid: true, errors: [] };
    }
    
    const errors: string[] = [];
    
    for (const rule of this.guardrails.inputValidation) {
      try {
        const isValid = await Promise.resolve(rule.validator(input));
        if (!isValid) {
          errors.push(rule.errorMessage);
        }
      } catch (error) {
        errors.push(`Validation error in rule ${rule.name}: ${error}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 验证输出内容
   */
  async validateOutput(output: string): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.guardrails.outputValidation || this.guardrails.outputValidation.length === 0) {
      return { valid: true, errors: [] };
    }
    
    const errors: string[] = [];
    
    for (const rule of this.guardrails.outputValidation) {
      try {
        const isValid = await Promise.resolve(rule.validator(output));
        if (!isValid) {
          errors.push(rule.errorMessage);
        }
      } catch (error) {
        errors.push(`Validation error in rule ${rule.name}: ${error}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 添加跟踪事件
   */
  addTraceEvent(type: TraceEvent['type'], data: any) {
    this.traceEvents.push({
      timestamp: Date.now(),
      type,
      data
    });
  }
  
  /**
   * 清除跟踪事件
   */
  clearTraceEvents() {
    this.traceEvents = [];
  }
  
  /**
   * 获取跟踪事件
   */
  getTraceEvents(): TraceEvent[] {
    return [...this.traceEvents];
  }
}
