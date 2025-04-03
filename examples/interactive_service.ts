import { Swarm, Agent, Handoff, Result, BuiltInRules, Message, Response } from '../src';
import { defaultConfig } from '../src/config';
import * as readline from 'readline';

/**
 * 交互式客服中心 - 通过命令行与客服系统交互
 * 通过LLM决定将请求转发给哪个客服代理
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
    model: "fc-llm",
    instructions: "你是中文客服代理韩梅梅，帮助用户解决各种问题。所有回复必须使用中文。每次回复都必须以'你好，我是韩梅梅'开头。保持专业、友好的态度。如果用户使用英文沟通，不要尝试用英文回答，请转给Lily处理。",
    maxTokens: 16384
  });
  
  // 创建英文客服Agent
  const englishAgent = new Agent({
    name: "Lily",
    model: "fc-llm",
    instructions: "You are an English customer service agent named Lily. All responses must be in English only. Always start your response with 'Hello, I am Lily'. Keep a professional and friendly attitude when helping users with their issues. If you detect Chinese characters, don't try to answer in Chinese, please transfer to Han Meimei.",
    maxTokens: 16384
  });
  
  // 创建接待客服Agent，添加工具函数让LLM决定转接
  const receptionAgent = new Agent({
    name: "Tars",
    model: "fc-llm",
    instructions: `你是接待客服Tars，你的职责是根据用户使用的语言将他们转接到合适的客服。
每次回复都必须以'你好，我是Tars'开头。
- 如果用户使用中文沟通，请调用transferToChineseAgent函数。
- 如果用户使用英文沟通，请调用transferToEnglishAgent函数。
不要直接回答用户的具体问题，你只负责转接。`,
    maxTokens: 16384,
    functions: [
      // 添加两个工具函数让LLM调用
      function transferToChineseAgent(context: any) {
        return new Result({
          value: "正在将您转接到中文客服韩梅梅...",
          agent: chineseAgent,
          context_variables: {
            language: "chinese",
            transfer_time: new Date().toISOString()
          }
        });
      },
      function transferToEnglishAgent(context: any) {
        return new Result({
          value: "Transferring you to our English support agent Lily...",
          agent: englishAgent,
          context_variables: {
            language: "english",
            transfer_time: new Date().toISOString()
          }
        });
      }
    ]
  });
  
  // 添加转回接待员的函数到中文和英文客服
  chineseAgent.functions = [
    function transferBackToReception(context: any) {
      return new Result({
        value: "检测到用户使用英文，转接回Tars...",
        agent: receptionAgent,
        context_variables: {
          note: "用户语言已变更，需要重新分配客服",
          transfer_time: new Date().toISOString()
        }
      });
    }
  ];
  
  englishAgent.functions = [
    function transferBackToReception(context: any) {
      return new Result({
        value: "Chinese detected, transferring back to Tars...",
        agent: receptionAgent,
        context_variables: {
          note: "User language changed, needs reassignment",
          transfer_time: new Date().toISOString()
        }
      });
    }
  ];
  
  // 创建readline接口用于命令行交互
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log("=== 客服中心Tars启动 ===");
  console.log("输入 'exit' 退出对话");
  console.log("输入您的问题，客服中心将根据您使用的语言自动转接\n");
  
  // 初始状态
  let currentMessages: Message[] = [];
  let currentAgent: Agent = receptionAgent;
  let currentContextVariables: Record<string, any> = {};
  
  // 递归函数处理用户输入
  async function processUserInput() {
    return new Promise<void>((resolve) => {
      rl.question('> ', async (userInput) => {
        if (userInput.toLowerCase() === 'exit') {
          console.log("\n感谢使用客服中心，再见！");
          rl.close();
          resolve();
          return;
        }
        
        try {
          // 添加用户消息
          const userMessage: Message = { role: "user", content: userInput } as Message;
          const updatedMessages = [...currentMessages, userMessage];
          
          console.log("\n正在处理您的请求...");
          
          // 使用Swarm运行当前Agent，LLM会决定是否调用转接函数
          const response = await customerServiceCenter.run(
            currentAgent,
            updatedMessages,
            currentContextVariables,
            false,
            Infinity,  // max_turns
            true,      // execute_tools
            null,      // model_override
            false      // debug
          ) as { messages: Message[]; agent: Agent; context_variables: Record<string, any> };
          
          // 更新状态
          currentMessages = response.messages;
          currentContextVariables = response.context_variables;
          
          // 检查是否发生了Agent切换
          if (response.agent.name !== currentAgent.name) {
            console.log(`\n${currentAgent.name} 将您转接到 ${response.agent.name} 客服`);
            currentAgent = response.agent;
          }
          
          // 过滤并输出客服回复（不显示工具调用消息）
          const assistantMessages = response.messages.filter(msg => 
            msg.role === 'assistant' && msg.content
          );
          
          if (assistantMessages.length > 0) {
            const lastMessage = assistantMessages[assistantMessages.length - 1];
            console.log(`\n${response.agent.name}: ${lastMessage.content}\n`);
          }
          
          // 继续处理用户输入
          await processUserInput();
          resolve();
        } catch (error) {
          console.error("处理请求出错:", error);
          console.log("请重试或输入 'exit' 退出");
          await processUserInput();
          resolve();
        }
      });
    });
  }
  
  // 开始处理用户输入
  await processUserInput();
}

// 运行交互式客服中心
main().catch(console.error); 