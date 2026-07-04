# Agent SDK

## StoryForge AI Developer Handbook

Version: 0.1.0

---

# What is an SDK?

SDK stands for Software Development Kit.

It is a reusable collection of classes, interfaces, utilities, and tools that developers use to build software consistently.

Instead of every AI agent implementing logging, validation, memory access, and result formatting separately, we build these features once inside the SDK.

Every future agent (Planner, Research, Story, Critic, etc.) inherits these capabilities automatically.

---

# Why did we build an SDK first?

Many AI projects begin by directly calling an LLM API.

Example:

User
↓
LLM
↓
Response

Although this works for simple projects, it becomes difficult to maintain as the project grows.

Problems:

- Code duplication
- Inconsistent logging
- Different response formats
- Difficult debugging
- Poor scalability

Instead, StoryForge AI follows:

Workflow Engine
↓
Agent SDK
↓
Agents
↓
LLM

This provides a common execution framework for every AI agent.

---

# Folder Structure

packages/
└── agent-sdk/
    ├── src/
    │   ├── core/
    │   ├── logging/
    │   ├── memory/
    │   ├── validation/
    │   ├── prompt/
    │   ├── types/
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md

Each folder has a single responsibility.

---

# AgentContext

Purpose:

AgentContext contains all the information required for an agent to execute.

Instead of:

execute(projectId, logger, config, input, memory)

we use:

execute(context)

Advantages:

- Cleaner APIs
- Easier maintenance
- Easy to extend
- Reduced parameter coupling

Current fields:

- projectId
- workflowRunId
- executionId
- agentName
- input
- sharedMemory
- config
- metadata

---

# AgentResult

Every agent returns the same structure.

Purpose:

The Workflow Engine should not care whether the result came from PlannerAgent or StoryAgent.

Every result contains:

- success
- output
- error
- logs
- metrics

Benefits:

- Consistent execution
- Easier debugging
- Easier testing

---

# Memory Layer

Files:

MemoryStore.ts

MemoryClient.ts

---

## Why not use objects?

Instead of:

const memory = {}

we use:

Map<string, unknown>

Advantages:

- Faster lookups
- Better semantics
- Built-in operations
- Cleaner API

---

## MemoryStore

Responsibility:

Stores key-value data.

Current implementation:

Map

Future implementations:

- Redis
- PostgreSQL
- MongoDB

The rest of the project will not need to change.

---

## MemoryClient

Agents never access MemoryStore directly.

Instead:

Planner
↓

MemoryClient
↓

MemoryStore

Advantages:

- Abstraction
- Easy testing
- Easy replacement of storage

---

# Logger

Originally:

logger.info("Started")

Only printed messages.

Improved version:

Logger now stores structured logs.

Each log contains:

- timestamp
- level
- message
- agent

Benefits:

- Easier debugging
- Can display logs in UI
- Future database support
- Future monitoring support

---

# Validation

ValidationResult

Represents:

- isValid
- errors

Validator

Current functionality:

validateRequired()

Purpose:

Prevent agents from executing with invalid inputs.

---

# Memory Keys

Instead of:

memory.set("story")

we use:

memory.set(MemoryKeys.STORY_DRAFT)

Advantages:

- No magic strings
- Type safety
- Better autocomplete
- Easier refactoring

---

# BaseAgent

The heart of the SDK.

Every future agent extends BaseAgent.

Execution lifecycle:

run()

↓

Clear Logger

↓

Validate Input

↓

Log Start

↓

Execute

↓

Log Finish

↓

Return AgentResult

↓

Catch Errors

Child agents only implement:

protected execute()

Everything else is handled automatically.

---

# Design Patterns Used

## Template Method Pattern

BaseAgent defines the workflow.

Child classes only implement execute().

Why?

Avoid duplicate execution logic.

---

## Dependency Injection (Partial)

MemoryClient is injected through the constructor.

Future:

Logger and Validator will also be injected.

Benefits:

- Better testing
- Better flexibility
- Loose coupling

---

## Abstraction

MemoryClient hides MemoryStore.

Agents never know where data is stored.

Current:

Map

Future:

Redis

No agent code changes.

---

# Software Engineering Principles

Single Responsibility Principle

Each class has one job.

Examples:

Logger

MemoryStore

Validator

MemoryClient

Open/Closed Principle

We can add new agents without modifying BaseAgent.

Composition over Inheritance

BaseAgent uses Logger and Validator rather than inheriting from them.

---

# Why did we build the SDK before the Workflow Engine?

Because every future agent requires:

- Logging
- Validation
- Shared Memory
- Standard Results

Building the SDK first prevents code duplication.

---

# Current Project Progress

Repository

✅

Monorepo

✅

Agent SDK

🟡 In Progress

Memory Layer

✅

Logger

✅

Validation

✅

BaseAgent

✅

Workflow Engine

⬜ Next

---

# Future Improvements

- Dependency Injection Container
- Metrics Service
- Prompt Versioning
- Retry Policy
- OpenTelemetry
- Distributed Memory
- Async Logging
- Redis Support
- PostgreSQL Support

---

# Interview Questions

Q1. Why did you create an Agent SDK?

Q2. Why separate MemoryClient and MemoryStore?

Q3. Why use Map instead of an object?

Q4. What is the Template Method Pattern?

Q5. Why create BaseAgent?

Q6. What problem does AgentContext solve?

Q7. Why use structured logging?

Q8. Why return AgentResult instead of raw data?

Q9. What improvements would you make in production?

Q10. How would you replace MemoryStore with Redis?

---

# Lessons Learned

Good AI software is not just about calling an LLM.

Most engineering effort is spent on:

- Architecture
- Logging
- Validation
- Memory
- Reusability
- Scalability
- Testing
- Maintainability

The Agent SDK provides this foundation for StoryForge AI.