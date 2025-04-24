import { OpenAI } from 'openai';

/**
 * 获取OpenAI客户端实例
 * 基于os_config.py中的配置
 */
export function getOpenAI(): OpenAI {
  // 设置环境变量
  process.env.OPENAI_API_KEY = "your key";
  process.env.OPENAI_API_BASE = "your url";
  
  // 创建OpenAI客户端
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE
  });
  
  return client;
}

/**
 * 获取默认配置对象
 */
export const defaultConfig = {
  apiKey: "sk-3kvmL2pBvCiclBnrDcA0A5E3DfB44773Ac0b41C5947a0395",
  apiBase: "http://116.63.86.12:3000/v1/"
}; 
