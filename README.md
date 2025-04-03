# TARS-Swarm

[English](doc/README.en.md) | [中文](doc/README.zh-CN.md) | [日本語](doc/README.ja.md)

TARS-Swarm is a TypeScript-based LLM agent orchestration framework for building and managing collaboration between multiple AI agents.

## Core Concepts

### Relationship between Swarm and Agent

The core architecture of TARS-Swarm is based on two main classes: `Swarm` and `Agent`. Their relationship is as follows:

#### Overall Architecture
- `Swarm` is an orchestrator that manages and coordinates multiple `Agent`s
- `Agent` is an independent LLM proxy representing a single AI assistant
- They have a "one-to-many" relationship, where one `Swarm` can manage multiple `Agent`s

#### Responsibility Division
- `Agent` class is responsible for:
  - Defining basic properties (name, model, instructions, etc.)
  - Managing functions and tools
  - Handling input/output validation
  - Maintaining its own trace events
   
- `Swarm` class is responsible for:
  - Managing model providers (ModelProvider)
  - Handling communication with LLM
  - Coordinating interactions between multiple agents
  - Managing global tracing system
  - Handling message history and context variables

#### Interaction Method
```typescript
// Create Swarm instance
const swarm = new Swarm({
  apiKey: "your-api-key",
  enableTracing: true
});

// Create Agent instance
const agent = new Agent({
  name: "Assistant",
  model: "gpt-4o",
  instructions: "You are a helpful assistant"
});

// Run Agent with Swarm
const response = await swarm.run(agent, messages, context_variables);
```

#### Key Features
- `Swarm` provides:
  - `run` and `runWithStream` methods to execute Agent
  - Handoff mechanism between Agents
  - Function call and tool usage management
  - Conversation history and context maintenance
   
- `Agent` provides:
  - Instruction management (`getInstructions`)
  - Function schema generation (`getFunctionSchemas`)
  - Input/output validation (`validateInput`/`validateOutput`)
  - Event tracking (`addTraceEvent`/`getTraceEvents`)

#### Data Flow
```
Swarm
├── Receive user input
├── Select/create Agent
├── Send request to LLM
├── Process response
├── Manage conversation history
└── Coordinate multiple Agents

Agent
├── Define behavior rules
├── Provide tool functions
├── Validate input/output
└── Record own events
```

#### Use Cases
- Single Agent scenario: Directly use Swarm to run a single Agent
- Multi-Agent collaboration: Coordinate interactions between multiple Agents through Swarm
- Complex workflows: Implement task handoff between Agents using Swarm's handoff mechanism

This design enables:
1. Flexible Agent configuration and reuse
2. Clear separation of responsibilities
3. Extensible architecture
4. Complete tracing and debugging capabilities
5. Complex workflow orchestration

## Installation

```bash
npm install tars-swarm
```

## Quick Start

```typescript
import { Swarm, Agent } from 'tars-swarm';

// Create Swarm instance
const swarm = new Swarm({
  apiKey: "your-api-key"
});

// Create Agent
const agent = new Agent({
  name: "Assistant",
  model: "gpt-4o",
  instructions: "You are a helpful assistant"
});

// Run conversation
const response = await swarm.run(
  agent,
  [{ role: "user", content: "Hello!" }]
);

// Get response
console.log(response.messages[response.messages.length - 1].content);
```

## Features

- 🤖 Support for multiple LLM agent collaboration
- 🔄 Handoff mechanism between Agents
- 🛡️ Built-in input/output validation
- 📊 Complete tracing and debugging capabilities
- 🔧 Extensible tools and function system
- 📝 Support for streaming output
- 🎯 Context variable management

## Examples

Check the `examples` directory for more examples:

- `basic.ts`: Basic usage example
- `handoff.ts`: Agent handoff example
- `tracing.ts`: Tracing feature example

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
