import { InputValidationRule, OutputValidationRule, SafetyCheckRule } from '../core/types';

/**
 * 输入验证器 - 验证用户输入是否符合规则
 */
export class InputValidator {
  rules: InputValidationRule[];
  
  constructor(rules: InputValidationRule[]) {
    this.rules = rules;
  }
  
  /**
   * 验证输入内容
   */
  async validate(input: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      try {
        const isValid = await Promise.resolve(rule.validator(input));
        if (!isValid) {
          errors.push(rule.errorMessage);
        }
      } catch (error) {
        errors.push(`验证规则 ${rule.name} 执行错误: ${error}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 输出验证器 - 验证模型输出是否符合规则
 */
export class OutputValidator {
  rules: OutputValidationRule[];
  
  constructor(rules: OutputValidationRule[]) {
    this.rules = rules;
  }
  
  /**
   * 验证输出内容
   */
  async validate(output: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      try {
        const isValid = await Promise.resolve(rule.validator(output));
        if (!isValid) {
          errors.push(rule.errorMessage);
        }
      } catch (error) {
        errors.push(`验证规则 ${rule.name} 执行错误: ${error}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 安全检查器 - 检查内容是否符合安全规则
 */
export class SafetyChecker {
  rules: SafetyCheckRule[];
  
  constructor(rules: SafetyCheckRule[]) {
    this.rules = rules;
  }
  
  /**
   * 检查内容
   */
  async check(content: string): Promise<{ safe: boolean; issues: Array<{ rule: SafetyCheckRule; result: boolean }> }> {
    const issues: Array<{ rule: SafetyCheckRule; result: boolean }> = [];
    
    for (const rule of this.rules) {
      try {
        const result = await Promise.resolve(rule.checker(content));
        if (!result) {
          issues.push({ rule, result });
        }
      } catch (error) {
        console.error(`安全规则 ${rule.name} 执行错误:`, error);
        issues.push({ rule, result: false });
      }
    }
    
    return {
      safe: issues.length === 0,
      issues
    };
  }
}

/**
 * 内置验证规则
 */
export const BuiltInRules = {
  /**
   * 输入验证规则
   */
  input: {
    /**
     * 不包含敏感词
     */
    noProfanity: (words: string[]): InputValidationRule => ({
      name: 'no_profanity',
      validator: (input) => {
        const regex = new RegExp(`\\b(${words.join('|')})\\b`, 'i');
        return !regex.test(input);
      },
      errorMessage: '输入包含敏感词汇，请修改。'
    }),
    
    /**
     * 最小长度
     */
    minLength: (length: number): InputValidationRule => ({
      name: 'min_length',
      validator: (input) => input.length >= length,
      errorMessage: `输入内容至少需要 ${length} 个字符。`
    }),
    
    /**
     * 最大长度
     */
    maxLength: (length: number): InputValidationRule => ({
      name: 'max_length',
      validator: (input) => input.length <= length,
      errorMessage: `输入内容不能超过 ${length} 个字符。`
    })
  },
  
  /**
   * 输出验证规则
   */
  output: {
    /**
     * 不包含敏感词
     */
    noProfanity: (words: string[]): OutputValidationRule => ({
      name: 'no_profanity',
      validator: (output) => {
        const regex = new RegExp(`\\b(${words.join('|')})\\b`, 'i');
        return !regex.test(output);
      },
      errorMessage: '输出包含敏感词汇，请修改。'
    }),
    
    /**
     * 最小长度
     */
    minLength: (length: number): OutputValidationRule => ({
      name: 'min_length',
      validator: (output) => output.length >= length,
      errorMessage: `输出内容至少需要 ${length} 个字符。`
    }),
    
    /**
     * 最大长度
     */
    maxLength: (length: number): OutputValidationRule => ({
      name: 'max_length',
      validator: (output) => output.length <= length,
      errorMessage: `输出内容不能超过 ${length} 个字符。`
    }),
    
    /**
     * 包含必要的信息
     */
    containsInfo: (patterns: string[]): OutputValidationRule => ({
      name: 'contains_info',
      validator: (output) => {
        return patterns.every(pattern => {
          const regex = new RegExp(pattern, 'i');
          return regex.test(output);
        });
      },
      errorMessage: `输出必须包含所有必要的信息。`
    })
  }
};
