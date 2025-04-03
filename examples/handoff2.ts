import { Swarm, Agent, Handoff, Result, BuiltInRules } from '../src';
import { defaultConfig } from '../src/config';

/**
 * 客服中心示例 - 演示多语言客服Agent路由系统
 * 根据用户语言自动转接到对应语言的客服
 */
async function main() {
  // 创建Swarm实例作为客服中心
  const customerServiceCenter = new Swarm({
    apiKey: defaultConfig.apiKey,
    enableTracing: true // 启用追踪
  });
  
  // 创建中文客服Agent
  const chineseAgent = new Agent({
    name: "韩梅梅",
    model: "gpt-4o", // 使用服务器支持的模型
    instructions: "你是中文客服代理韩梅梅，帮助用户解决各种问题。所有回复必须使用中文。每次回复都必须以'你好，我是韩梅梅'开头。保持专业、友好的态度。"
  });
  
  // 创建英文客服Agent
  const englishAgent = new Agent({
    name: "Lily",
    model: "gpt-4o", // 使用服务器支持的模型
    instructions: "You are an English customer service agent named Lily. All responses must be in English only. Always start your response with 'Hello, I am Lily'. Keep a professional and friendly attitude when helping users with their issues."
  });
  
  // 创建接待客服Agent
  const receptionAgent = new Agent({
    name: "Tars",
    model: "gpt-4o", // 使用服务器支持的模型
    instructions: "你是接待客服Tars，负责识别用户使用的语言，并将用户转接到对应的客服。每次回复都必须以'你好，我是Tars'开头。如果用户使用中文，将其转接给中文客服韩梅梅；如果用户使用英文，将其转接给英文客服Lily。"
  });
  
  // 创建转接到中文客服的握手函数
  function transferToChineseAgent(contextVariables: Record<string, any>) {
    console.log("转接到中文客服韩梅梅...");
    return new Result({
      value: "正在将您转接到中文客服韩梅梅...",
      agent: chineseAgent,
      context_variables: {
        ...contextVariables,
        language: "chinese",
        transfer_time: new Date().toISOString()
      }
    });
  }
  
  // 创建转接到英文客服的握手函数
  function transferToEnglishAgent(contextVariables: Record<string, any>) {
    console.log("Transferring to English support agent Lily...");
    return new Result({
      value: "Transferring you to our English support agent Lily...",
      agent: englishAgent,
      context_variables: {
        ...contextVariables,
        language: "english",
        transfer_time: new Date().toISOString()
      }
    });
  }
  
  // 添加握手函数到接待Agent
  receptionAgent.functions.push(transferToChineseAgent);
  receptionAgent.functions.push(transferToEnglishAgent);
  
  try {
    // 运行对话
    console.log("=== 客服中心Tars启动 ===\n");
    
    console.log("发送中文请求到接待客服Tars...");
    // 中文用户询问问题
    const chineseResponse = await customerServiceCenter.run(
      receptionAgent,
      [{ role: "user", content: "你好，我的账户登录有问题，能帮我解决吗？" }],
      {}, // 空上下文变量
      false // 明确关闭流式输出
    ) as { messages: any[]; agent: Agent; context_variables: Record<string, any> };
    
    // 输出结果
    const lastChineseMessage = chineseResponse.messages[chineseResponse.messages.length - 1];
    console.log(`\n${chineseResponse.agent.name}: ${lastChineseMessage.content}\n`);
    
    // 查看上下文变量
    console.log("上下文变量:", chineseResponse.context_variables);
    
    // 继续中文对话
    const chineseContinue = await customerServiceCenter.run(
      chineseResponse.agent, // 使用上一轮对话转接后的Agent
      [
        ...chineseResponse.messages,
        { role: "user", content: "我想重置密码，但是没收到验证邮件" }
      ],
      chineseResponse.context_variables, // 传递上一轮对话的上下文变量
      false // 明确关闭流式输出
    ) as { messages: any[]; agent: Agent; context_variables: Record<string, any> };
    
    // 输出结果
    const lastChineseContinue = chineseContinue.messages[chineseContinue.messages.length - 1];
    console.log(`\n${chineseContinue.agent.name}: ${lastChineseContinue.content}\n`);
    
    // 发送英文请求到接待客服
    console.log("\n=== 新用户连接到客服中心Tars ===");
    console.log("发送英文请求到接待客服Tars...");
    const englishResponse = await customerServiceCenter.run(
      receptionAgent,
      [{ role: "user", content: "Hello, I can't log into my account. Can you help me?" }],
      {}, // 空上下文变量
      false // 明确关闭流式输出
    ) as { messages: any[]; agent: Agent; context_variables: Record<string, any> }; 

    // 输出结果
    const lastEnglishMessage = englishResponse.messages[englishResponse.messages.length - 1];
    console.log(`\n${englishResponse.agent.name}: ${lastEnglishMessage.content}\n`);    
    
    // 继续英文对话
    const englishContinue = await customerServiceCenter.run(
      englishResponse.agent, // 使用上一轮对话转接后的Agent
      [
        ...englishResponse.messages,
        { role: "user", content: "I need to reset my password but I'm not receiving the verification email" }
      ],
      englishResponse.context_variables, // 传递上一轮对话的上下文变量
      false // 明确关闭流式输出
    ) as { messages: any[]; agent: Agent; context_variables: Record<string, any> };
    
    // 输出结果
    const lastEnglishContinue = englishContinue.messages[englishContinue.messages.length - 1];
    console.log(`\n${englishContinue.agent.name}: ${lastEnglishContinue.content}\n`);
    
    // 测试混合语言场景
    console.log("\n=== 测试混合语言场景 ===");
    console.log("发送混合语言请求到接待客服Tars...");
    const mixedResponse = await customerServiceCenter.run(
      receptionAgent,
      [{ role: "user", content: "Hello, 我需要帮助。My account 登录不了。" }],
      {}, // 空上下文变量
      false // 明确关闭流式输出
    ) as { messages: any[]; agent: Agent; context_variables: Record<string, any> };
    
    // 输出结果
    const lastMixedMessage = mixedResponse.messages[mixedResponse.messages.length - 1];
    console.log(`\n${mixedResponse.agent.name}: ${lastMixedMessage.content}\n`);
    
  } catch (error) {
    console.error("客服中心运行出错:", error);
  }
}

// 运行客服中心示例
main().catch(console.error);
