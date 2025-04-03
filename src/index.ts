// 核心类
export { Agent } from './core/agent';
export { Swarm } from './core/swarm';
export { Result } from './core/result';

// 类型
export type {
  Message,
  Response,
  AgentConfig,
  GuardrailConfig,
  InputValidationRule,
  OutputValidationRule,
  SafetyCheckRule,
  TraceEvent,
  ModelProvider,
  SwarmConfig,
  HandoffCondition
} from './core/types';

// 守卫
export {
  InputValidator,
  OutputValidator,
  SafetyChecker,
  BuiltInRules
} from './guardrails';

// 追踪
export {
  Tracer,
  TraceVisualizer
} from './tracing';

// 导入Result以在Handoff类中使用
import { Result } from './core/result';

// 导出一个用于创建握手函数的工具类
export class Handoff {
  /**
   * 创建一个握手函数，用于转移到目标Agent
   */
  static createHandoffFunction(
    targetAgent: any,
    updateContextVariables?: Record<string, any>
  ) {
    return function handoff(currentContextVariables?: Record<string, any>) {
      return new Result({
        agent: targetAgent,
        context_variables: updateContextVariables
          ? { ...currentContextVariables, ...updateContextVariables }
          : currentContextVariables
      });
    };
  }

  /**
   * 创建一个条件握手函数，根据条件决定是否转移以及转移到哪个Agent
   */
  static createConditionalHandoff(conditions: Array<{
    condition: (contextVariables: Record<string, any>) => boolean;
    targetAgent: any;
    updateContextVariables?: Record<string, any>;
  }>) {
    return function conditionalHandoff(contextVariables: Record<string, any>) {
      for (const { condition, targetAgent, updateContextVariables } of conditions) {
        if (condition(contextVariables)) {
          return new Result({
            agent: targetAgent,
            context_variables: updateContextVariables
              ? { ...contextVariables, ...updateContextVariables }
              : contextVariables
          });
        }
      }
      // 如果没有条件匹配，返回null
      return null;
    };
  }
}
