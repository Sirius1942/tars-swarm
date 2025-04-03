import { Swarm, Agent, Response, TraceVisualizer } from '../src';
import { saveTraceToFile } from '../src/utils';
import { defaultConfig } from '../src/config';
import path from 'path';

/**
 * 跟踪示例 - 演示如何使用Tracing功能记录大模型交互
 */
async function main() {
  // 创建Swarm实例，启用跟踪功能
  const client = new Swarm({
    apiKey: defaultConfig.apiKey,
    enableTracing: true // 显式启用跟踪
  });
  
  // 创建Agent
  const agent = new Agent({
    name: "调试代理",
    model: "gpt-4o", // 使用服务器支持的模型
    instructions: "你是调试代理，帮助用户解决编程问题。提供详细的解释和代码示例。"
  });
  
  try {
    console.log("正在发送请求...");
    // 运行对话
    const response = await client.run(
      agent,
      [{ role: "user", content: "如何使用TypeScript的装饰器？" }],
      {}  // 空上下文变量
    ) as Response;
    
    // 输出模型响应
    const lastMessage = response.messages[response.messages.length - 1];
    console.log(`\n${agent.name}: ${lastMessage.content}\n`);
    
    // 获取跟踪事件
    if (response.trace) {
      // 使用TraceVisualizer生成控制台视图
      const consoleView = TraceVisualizer.generateConsoleView(response.trace);
      console.log("\n===== 跟踪事件 =====\n");
      console.log(consoleView);
      
      // 保存跟踪事件到文件
      const traceFilePath = path.join(__dirname, '..', 'trace', 'trace.json');
      saveTraceToFile(response.trace, traceFilePath);
      
      // 可选：使用TraceVisualizer生成HTML时间线
      const htmlTimeline = TraceVisualizer.generateTimelineHTML(response.trace);
      const htmlFilePath = path.join(__dirname, '..', 'trace', 'timeline.html');
      require('fs').writeFileSync(htmlFilePath, htmlTimeline, 'utf8');
      console.log(`HTML时间线已保存到：${htmlFilePath}`);
      
      // 打印关键的模型调用信息
      console.log("\n===== 模型调用信息 =====\n");
      const modelCalls = response.trace.filter(event => event.type === 'model_call');
      for (const call of modelCalls) {
        console.log(`模型：${call.data.model}`);
        console.log(`时间：${new Date(call.timestamp).toLocaleString()}`);
        console.log(`消息数：${call.data.messages?.length || 0}\n`);
      }
    }
    
  } catch (error) {
    console.error("运行出错:", error);
  }
}

// 运行示例
main().catch(console.error); 