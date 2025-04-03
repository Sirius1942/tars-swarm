import fs from 'fs';
import path from 'path';
import { TraceEvent } from '../core/types';
import { TraceVisualizer } from '../tracing';

/**
 * 保存跟踪事件到文件
 */
export function saveTraceToFile(
  trace: TraceEvent[],
  filePath: string
): void {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 保存为JSON文件
    fs.writeFileSync(
      filePath,
      JSON.stringify(trace, null, 2),
      'utf8'
    );
    
    console.log(`跟踪事件已保存到 ${filePath}`);
  } catch (error) {
    console.error('保存跟踪事件失败:', error);
  }
}

/**
 * 将跟踪事件保存为HTML时间线
 */
export function saveTraceAsHtml(
  trace: TraceEvent[],
  filePath: string
): void {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 生成HTML并保存
    const html = TraceVisualizer.generateTimelineHTML(trace);
    fs.writeFileSync(filePath, html, 'utf8');
    
    console.log(`跟踪时间线已保存到 ${filePath}`);
  } catch (error) {
    console.error('保存跟踪时间线失败:', error);
  }
}

/**
 * 打印消息链
 */
export function printMessageChain(messages: any[]): void {
  messages.forEach((message, index) => {
    if (index === 0 && message.role === 'system') {
      console.log(`系统: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`);
      return;
    }
    
    switch (message.role) {
      case 'user':
        console.log(`用户: ${message.content}`);
        break;
      case 'assistant':
        console.log(`助手: ${message.content}`);
        if (message.tool_calls) {
          message.tool_calls.forEach((tool: any) => {
            if (tool.type === 'function') {
              console.log(`调用函数: ${tool.function.name}(${tool.function.arguments})`);
            }
          });
        }
        break;
      case 'tool':
      case 'function':
        console.log(`工具 ${message.name}: ${message.content}`);
        break;
      default:
        console.log(`[${message.role}]: ${message.content}`);
    }
  });
}

/**
 * 创建交互式命令行界面
 */
export function createInteractiveCLI(
  swarm: any,
  agent: any,
  options: {
    prompt?: string;
    contextVariables?: Record<string, any>;
    stream?: boolean;
  } = {}
): void {
  const { prompt = '> ', contextVariables = {}, stream = false } = options;
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  let messages: any[] = [];
  
  console.log('输入 "exit" 或 "quit" 退出\n');
  
  const promptUser = () => {
    rl.question(prompt, async (input: string) => {
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        rl.close();
        return;
      }
      
      messages.push({ role: 'user', content: input });
      
      try {
        if (stream) {
          // 处理流式响应
          console.log('\n');
          const streamResponse = swarm.run(agent, messages, contextVariables, true);
          
          for await (const chunk of streamResponse) {
            if (chunk.delim === 'start') {
              process.stdout.write('助手: ');
            } else if (chunk.choices && chunk.choices[0].delta.content) {
              process.stdout.write(chunk.choices[0].delta.content);
            } else if (chunk.delim === 'end') {
              process.stdout.write('\n\n');
            }
          }
        } else {
          // 处理非流式响应
          const response = await swarm.run(agent, messages, contextVariables) as any;
          
          // 更新消息历史和Agent
          messages = response.messages;
          agent = response.agent;
          
          // 输出响应
          const lastMessage = messages[messages.length - 1];
          console.log(`\n助手: ${lastMessage.content}\n`);
        }
      } catch (error) {
        console.error('错误:', error);
      }
      
      promptUser();
    });
  };
  
  promptUser();
}
