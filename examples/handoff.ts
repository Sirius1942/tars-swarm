import { Swarm, Agent, Handoff, Result, BuiltInRules } from '../src';
import { defaultConfig } from '../src/config';

/**
 * Handoff示例 - 演示Agent之间的握手转移
 * 简化版，不使用流式输出
 */
async function main() {
  // 创建Swarm实例，使用配置文件中的设置
  const client = new Swarm({
    apiKey: defaultConfig.apiKey,
    enableTracing: true // 启用追踪
  });
  
  // 创建客服Agent
  const customerServiceAgent = new Agent({
    name: "客服代理",
    model: "gpt-4o", // 使用服务器支持的模型
    instructions: "你是客服代理，帮助用户解决非技术问题。如果用户询问技术问题，请将其转交给技术支持。"
  });
  
  // 创建技术支持Agent
  const technicalSupportAgent = new Agent({
    name: "技术支持",
    model: "gpt-4o", // 使用服务器支持的模型
    instructions: "你是技术支持代理，提供详细的技术解决方案。如果用户询问账单问题，请将其转回客服代理。"
  });
  
  // 创建握手函数
  function transferToTechSupport(contextVariables: Record<string, any>) {
    console.log("转移到技术支持...");
    return new Result({
      value: "正在将您转接到技术支持部门...",
      agent: technicalSupportAgent,
      context_variables: {
        ...contextVariables,
        transferred_reason: "technical_issue",
        transfer_time: new Date().toISOString()
      }
    });
  }
  
  function transferToCustomerService(contextVariables: Record<string, any>) {
    console.log("转移回客服...");
    return new Result({
      value: "正在将您转接回客服部门...",
      agent: customerServiceAgent,
      context_variables: {
        ...contextVariables,
        transferred_reason: "billing_issue",
        transfer_time: new Date().toISOString()
      }
    });
  }
  
  // 也可以使用Handoff类创建握手函数
  const transferToTechSupport2 = Handoff.createHandoffFunction(
    technicalSupportAgent,
    { transferred_reason: "technical_issue" }
  );
  
  // 添加握手函数到Agent
  customerServiceAgent.functions.push(transferToTechSupport);
  technicalSupportAgent.functions.push(transferToCustomerService);
  
  try {
    // 运行对话
    console.log("开始对话...\n");
    
    console.log("正在发送请求到客服代理...");
    // 第一轮对话 - 用户询问技术问题
    const response1 = await client.run(
      customerServiceAgent,
      [{ role: "user", content: "我的账户登录不了，显示密码错误，但我确定密码是对的。" }],
      {}, // 空上下文变量
      false // 明确关闭流式输出
    ) as { messages: any[]; agent: Agent; context_variables: Record<string, any> };
    
    // 输出结果
    const lastMessage1 = response1.messages[response1.messages.length - 1];
    console.log(`\n${response1.agent.name}: ${lastMessage1.content}\n`);
    
    // 查看上下文变量
    console.log("上下文变量:", response1.context_variables);
    
    console.log("正在发送后续请求...");
    // 继续对话
    const response2 = await client.run(
      response1.agent, // 使用上一轮对话的Agent
      [
        ...response1.messages,
        { role: "user", content: "我想了解如何重置密码。" }
      ],
      response1.context_variables, // 传递上一轮对话的上下文变量
      false // 明确关闭流式输出
    ) as { messages: any[]; agent: Agent; context_variables: Record<string, any> };
    
    // 输出结果
    const lastMessage2 = response2.messages[response2.messages.length - 1];
    console.log(`\n${response2.agent.name}: ${lastMessage2.content}\n`);
    
  } catch (error) {
    console.error("运行出错:", error);
  }
}

// 运行示例
main().catch(console.error);
