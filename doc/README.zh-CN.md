# TARS-Swarm

TARS-Swarm 是一个基于 TypeScript 实现的 LLM 代理编排框架，用于构建和管理多个 AI 代理之间的协作。

## 核心概念

### Swarm 和 Agent 的关系

TARS-Swarm 的核心架构基于两个主要类：`Swarm` 和 `Agent`。它们之间的关系如下：

#### 整体架构关系
- `Swarm` 是一个编排器（Orchestrator），负责管理和协调多个 `Agent`
- `Agent` 是一个独立的 LLM 代理，代表单个 AI 助手
- 它们之间是"一对多"的关系，一个 `Swarm` 可以管理多个 `Agent`

#### 职责分工
- `Agent` 类负责：
  - 定义代理的基本属性（名称、模型、指令等）
  - 管理函数和工具
  - 处理输入输出验证
  - 维护自己的跟踪事件
   
- `Swarm` 类负责：
  - 管理模型提供商（ModelProvider）
  - 处理与 LLM 的通信
  - 协调多个 Agent 之间的交互
  - 管理全局的跟踪系统
  - 处理消息历史和上下文变量

#### 交互方式
```typescript
// 创建 Swarm 实例
const swarm = new Swarm({
  apiKey: "your-api-key",
  enableTracing: true
});

// 创建 Agent 实例
const agent = new Agent({
  name: "助手",
  model: "gpt-4o",
  instructions: "你是一个有帮助的助手"
});

// Swarm 运行 Agent
const response = await swarm.run(agent, messages, context_variables);
```

#### 关键功能
- `Swarm` 提供了：
  - `run` 和 `runWithStream` 方法来执行 Agent
  - Agent 之间的握手（handoff）机制
  - 函数调用和工具使用管理
  - 对话历史和上下文维护
   
- `Agent` 提供了：
  - 指令管理（`getInstructions`）
  - 函数模式生成（`getFunctionSchemas`）
  - 输入输出验证（`validateInput`/`validateOutput`）
  - 事件跟踪（`addTraceEvent`/`getTraceEvents`）

#### 数据流向
```
Swarm
├── 接收用户输入
├── 选择/创建 Agent
├── 发送请求到 LLM
├── 处理响应
├── 管理对话历史
└── 协调多个 Agent

Agent
├── 定义行为规则
├── 提供工具函数
├── 验证输入输出
└── 记录自身事件
```

#### 使用场景
- 单 Agent 场景：直接使用 Swarm 运行单个 Agent
- 多 Agent 协作：通过 Swarm 协调多个 Agent 之间的交互
- 复杂工作流：利用 Swarm 的握手机制实现 Agent 之间的任务传递

这种设计允许：
1. 灵活的 Agent 配置和重用
2. 清晰的职责分离
3. 可扩展的架构
4. 完整的跟踪和调试能力
5. 复杂的工作流程编排

## 安装

```bash
npm install tars-swarm
```

## 快速开始

```typescript
import { Swarm, Agent } from 'tars-swarm';

// 创建 Swarm 实例
const swarm = new Swarm({
  apiKey: "your-api-key"
});

// 创建 Agent
const agent = new Agent({
  name: "助手",
  model: "gpt-4o",
  instructions: "你是一个有帮助的助手"
});

// 运行对话
const response = await swarm.run(
  agent,
  [{ role: "user", content: "你好！" }]
);

// 获取响应
console.log(response.messages[response.messages.length - 1].content);
```

## 特性

- 🤖 支持多个 LLM 代理协作
- 🔄 Agent 之间的握手传递机制
- 🛡️ 内置输入输出验证
- 📊 完整的跟踪和调试能力
- 🔧 可扩展的工具和函数系统
- 📝 支持流式输出
- 🎯 上下文变量管理

## 示例

查看 `examples` 目录获取更多示例：

- `basic.ts`: 基础用法示例
- `handoff.ts`: Agent 握手传递示例
- `tracing.ts`: 跟踪功能示例

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。 