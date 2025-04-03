import { Swarm, Agent, Response } from '../src';
import { defaultConfig } from '../src/config';

/**
 * 基本示例 - 演示Swarm和Agent的基本使用
 * 简化版，不使用流式输出
 */
async function main() {
  // 创建Swarm实例，使用配置文件中的设置
  const client = new Swarm({
    apiKey: defaultConfig.apiKey
  });
  
  // 创建Agent
  const agent = new Agent({
    name: "EchoAgent",
    model: "gpt-4o", // 使用服务器支持的模型
    instructions: "You are an echo agent. Repeat whatever the user says."
  });
  
  try {
    console.log("正在发送请求...");
    // 运行对话
    const response = await client.run(
      agent,
      [{ role: "user", content: "TypeScript中如何定义一个接口？" }],
      {},  // 空上下文变量
      false // 明确关闭流式输出
    ) as Response; // 类型断言，避免类型错误
    
    // 输出模型响应
    const lastMessage = response.messages[response.messages.length - 1];
    console.log(`\n${agent.name}: ${lastMessage.content}\n`);
    
  } catch (error) {
    console.error("运行出错:", error);
  }
}

// 运行示例
main().catch(console.error);
