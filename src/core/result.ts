/**
 * Result类用于封装函数调用的返回值
 * 支持返回值、新Agent和上下文变量
 */
export class Result {
  value?: string;
  agent?: any; // Agent类型，避免循环依赖
  context_variables?: Record<string, any>;

  constructor(options: {
    value?: string;
    agent?: any;
    context_variables?: Record<string, any>;
  }) {
    this.value = options.value;
    this.agent = options.agent;
    this.context_variables = options.context_variables;
  }

  /**
   * 创建一个只包含值的Result
   */
  static withValue(value: string): Result {
    return new Result({ value });
  }

  /**
   * 创建一个只包含Agent的Result
   */
  static withAgent(agent: any): Result {
    return new Result({ agent });
  }

  /**
   * 创建一个只包含上下文变量的Result
   */
  static withContext(context_variables: Record<string, any>): Result {
    return new Result({ context_variables });
  }
}
