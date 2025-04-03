/**
 * 消息类型，与OpenAI API兼容
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * Agent类型
 */
export interface AgentConfig {
  name?: string;
  model?: string;
  instructions?: InstructionsType;
  functions?: FunctionType[];
  tool_choice?: string | null;
  guardrails?: GuardrailConfig;
  maxTokens?: number;
  parallel_tool_calls?: boolean;
}

/**
 * 指令类型：可以是字符串或返回字符串的函数
 */
export type InstructionsType = string | ((context_variables?: Record<string, any>) => string);

/**
 * 函数类型：可以是函数、字符串或函数定义对象
 */
export type FunctionType = Function | string | Record<string, any>;

/**
 * 响应类型
 */
export interface Response {
  messages: Message[];
  agent: any; // Agent类型，避免循环依赖
  context_variables: Record<string, any>;
  trace?: TraceEvent[];
}

/**
 * 守卫配置
 */
export interface GuardrailConfig {
  inputValidation?: InputValidationRule[];
  outputValidation?: OutputValidationRule[];
  safetyChecks?: SafetyCheckRule[];
}

/**
 * 输入验证规则
 */
export interface InputValidationRule {
  name: string;
  validator: (input: string) => boolean | Promise<boolean>;
  errorMessage: string;
}

/**
 * 输出验证规则
 */
export interface OutputValidationRule {
  name: string;
  validator: (output: string) => boolean | Promise<boolean>;
  errorMessage: string;
}

/**
 * 安全检查规则
 */
export interface SafetyCheckRule {
  name: string;
  checker: (content: string) => boolean | Promise<boolean>;
  severity: 'warning' | 'error';
  action: 'log' | 'block' | 'modify';
  errorMessage: string;
}

/**
 * 追踪事件
 */
export interface TraceEvent {
  timestamp: number;
  type: 'agent_start' | 'agent_end' | 'function_call' | 'function_return' | 'handoff' | 'guardrail_check' | 'model_call';
  data: any;
}

/**
 * 模型提供商接口
 */
export interface ModelProvider {
  id: string;
  createChatCompletion: (options: any) => Promise<any>;
  createChatCompletionStream: (options: any) => AsyncGenerator<any, void, unknown>;
}

/**
 * Swarm配置
 */
export interface SwarmConfig {
  apiKey?: string;
  modelProvider?: ModelProvider;
  enableTracing?: boolean;
}

/**
 * Handoff类型
 */
export interface HandoffCondition {
  condition: (contextVariables: Record<string, any>) => boolean;
  targetAgent: any; // Agent类型，避免循环依赖
  updateContextVariables?: Record<string, any>;
}
