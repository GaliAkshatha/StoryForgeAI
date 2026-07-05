# StoryForge AI v1 Blueprint
Version: 1.0
Status: FROZEN
Date: 5 July 2026

---

# Vision

StoryForge AI is a production-ready multi-agent AI platform that transforms a user's simple story idea into a complete story using specialized AI agents coordinated by a workflow engine.

The architecture is designed to be:

- Modular
- Scalable
- Testable
- Provider Independent
- Production Ready

This document defines StoryForge V1.

No architectural changes are allowed unless there is a genuine engineering issue.

---

# Core Philosophy

We are NOT building

"A Gemini wrapper."

We are building

"A reusable AI platform."

Every module has exactly ONE responsibility.

---

# System Architecture

                    User
                      │
                      ▼
            Requirement Agent
                      │
                      ▼
          StoryRequirements Object
                      │
                      ▼
               Planner Agent
                      │
                      ▼
              Research Agent
                      │
                      ▼
                Story Agent
                      │
                      ▼
               Critic Agent
                      │
                      ▼
                Scene Agent
                      │
                      ▼
                Image Agent
                      │
                      ▼
                Video Agent

The Workflow Engine coordinates every step.

Agents NEVER call each other directly.

---

# Final Folder Structure

StoryForgeAI/

apps/
    api/
    web/

packages/

    agent-sdk/

    workflow-engine/

    llm-client/

    prompt-manager/

    planner-agent/

    research-agent/

    story-agent/

    critic-agent/

    scene-agent/

    image-agent/

    video-agent/

    shared/

docs/

tests/

.github/

infrastructure/

README.md

Status:
FROZEN

---

# Package Responsibilities

agent-sdk

Provides the common foundation for every agent.

Contains:

BaseAgent

ExecutionMemory

Logger

Validator

AgentContext

AgentResult

Memory Interfaces

------------------------

workflow-engine

Coordinates execution.

Knows execution order.

Handles retries.

Future:

Parallel execution

Checkpointing

Recovery

------------------------

llm-client

Responsible ONLY for talking to AI providers.

Provides

LLMClient Interface

GeminiClient

Future:

OpenAIClient

ClaudeClient

DeepSeekClient

------------------------

prompt-manager

Responsible ONLY for prompt templates.

Stores templates.

Compiles variables.

Versioning.

Nothing else.

------------------------

shared

Common models

Enums

Constants

Utilities

Shared Types

---

# AI Workflow

User

↓

Requirement Agent

↓

StoryRequirements

↓

Planner Agent

↓

StoryPlan

↓

Research Agent

↓

ResearchNotes

↓

Story Agent

↓

Story Draft

↓

Critic Agent

↓

Improved Draft

↓

Scene Agent

↓

Scene List

↓

Image Agent

↓

Generated Images

↓

Video Agent

↓

Final Story Package

Status:
FROZEN

---

# Requirement Agent

Purpose

Transforms incomplete user input into complete StoryRequirements.

Example Input

Genre

Audience

Moral

Example Output

StoryRequirements

Genre

Audience

Tone

Story Length

Reading Level

Narration Style

Ending Style

Theme

Educational Focus

Requirement Agent NEVER writes prompts.

Requirement Agent NEVER calls Gemini directly.

Requirement Agent only creates structured requirements.

---

# Planner Agent

Input

StoryRequirements

Output

StoryPlan

Responsibilities

Title

Characters

Story Beats

Tone

Theme

Setting

Estimated Reading Time

Nothing else.

---

# Research Agent

Input

StoryPlan

Output

Research Notes

Responsibilities

Fact verification

Cultural references

Historical accuracy

Scientific accuracy

Future web search

---

# Story Agent

Input

StoryPlan

ResearchNotes

Output

Story Draft

Responsibilities

Generate the complete story.

---

# Critic Agent

Input

Story Draft

Output

Improved Story Draft

Responsibilities

Improve

Grammar

Flow

Consistency

Tone

Character consistency

---

# Scene Agent

Input

Improved Story

Output

Scene List

Each scene contains

Description

Camera Direction

Image Prompt

Narration

---

# Image Agent

Input

Scene

Output

Image

Future

Stable Diffusion

Flux

GPT Image

Imagen

---

# Video Agent

Input

Scene Images

Narration

Output

Final Video

---

# Prompt Flow

Agent

↓

PromptManager

↓

Prompt Repository

↓

Prompt Template

↓

Compiled Prompt

↓

LLM

Prompts NEVER exist inside agents.

Status:
FROZEN

---

# LLM Flow

Planner

↓

LLMClient Interface

↓

GeminiClient

↓

Google Gemini

Future

OpenAI

Claude

DeepSeek

Planner NEVER depends on Gemini.

Status:
FROZEN

---

# Memory Architecture

StoryForge has TWO memory systems.

1.

Execution Memory

Purpose

Temporary

Workflow only

Implementation

In-memory Map

Destroyed after workflow.

Used for communication between agents.

Planner

↓

ExecutionMemory

↓

Research

↓

Story

Status:
FROZEN

---

2.

Knowledge Storage

Purpose

Persistent

Database

Stores

Stories

Characters

Feedback

Execution Logs

Prompt Versions

Analytics

Future Learning

Status:
FROZEN

---

# Database

Chosen Database

PostgreSQL

Reason

Production ready

ACID

JSONB

Supports pgvector later

Future

pgvector

Semantic Search

Status:
FROZEN

---

# Logging

Every agent execution creates

ExecutionLog

Workflow Id

Agent

Start Time

End Time

Latency

Success

Token Usage

Error

Prompt Version

Status:
FROZEN

---

# User Feedback

Version 2

Story Rating

Comments

Favorite Stories

Feedback History

Future

Personalized generation.

---

# Interfaces

Frozen

LLMClient

PromptManager

BaseAgent

WorkflowEngine

AgentContext

AgentResult

ExecutionMemory

---

# Dependency Injection

Agents NEVER create

GeminiClient

PromptManager

ExecutionMemory

Repositories

Everything is injected.

Status:
FROZEN

---

# SOLID Principles Used

Single Responsibility

Open Closed

Liskov

Interface Segregation

Dependency Inversion

Status:
FROZEN

---

# Development Process

Every feature

Requirement

↓

Implementation

↓

Compile

↓

Run

↓

Test

↓

Commit

↓

Next Feature

No redesign during implementation.

---

# Sprint Roadmap

Sprint 1

Monorepo

DONE

Sprint 2

Agent SDK

DONE

Sprint 3

Workflow Engine

DONE

Sprint 4

LLM Client

DONE

Sprint 5

Prompt Manager

DONE

Sprint 6

Planner Agent

IN PROGRESS

Sprint 7

Research Agent

Sprint 8

Story Agent

Sprint 9

Critic Agent

Sprint 10

Scene Agent

Sprint 11

API

Sprint 12

Frontend

Sprint 13

Deployment

---

# Version 2

Database Learning

User Accounts

Feedback

Semantic Search

Recommendation Engine

Prompt Optimization

Analytics Dashboard

Cost Optimization

Streaming

---

# Version 3

Collaborative Storytelling

Voice Narration

Story Editing

Interactive Stories

Fine Tuned Models

Agent Marketplace

---

# Golden Rules

Every package has one responsibility.

Every agent has one responsibility.

Agents never call other agents.

Agents communicate only through ExecutionMemory.

PromptManager owns prompts.

LLMClient owns providers.

Workflow Engine owns execution.

RequirementAgent owns requirement analysis.

No architecture redesign unless absolutely required.

Build.

Test.

Commit.

Repeat.

END OF STORYFORGE V1 BLUEPRINT


# StoryForge AI
## Blueprint V1 (Frozen)

Version: 1.0
Status: Frozen
Last Updated: July 2026

---

# 1. Vision

StoryForge is a production-ready Multi-Agent AI Story Generation Platform.

A user provides a simple natural language request.

Example:

"I want a funny fantasy story about a lonely dragon who learns sharing."

StoryForge automatically:

• Understands the request
• Plans the story
• Performs research
• Writes the story
• Reviews quality
• Splits into scenes
• Returns a polished story

---

# 2. Goals

Build a production-quality AI system using:

• TypeScript
• pnpm Monorepo
• Modular Packages
• Multi-Agent Architecture
• Google Gemini
• PostgreSQL
• React

The system must be scalable, maintainable and interview-worthy.

---

# 3. Non Goals (V1)

NOT included in V1:

❌ Vector Database
❌ RAG
❌ Image Generation
❌ Voice Generation
❌ Multiple LLM Providers
❌ Fine Tuning
❌ Agent Parallel Execution

These belong to V2.

---

# 4. Architecture Principles

Principle 1

One Package = One Responsibility

Examples

agent-sdk
Only agent abstractions

llm-client
Only LLM communication

prompt-manager
Only prompts

planner-agent
Only planning

Never mix responsibilities.

---

Principle 2

Dependency Injection Everywhere

Agents never create:

LLM

PromptManager

Memory

Everything is injected.

---

Principle 3

Agents never know each other.

RequirementAgent never imports PlannerAgent.

PlannerAgent never imports StoryAgent.

Only Workflow Engine orchestrates.

---

Principle 4

Reusable Components

Every reusable feature becomes its own package.

Never duplicate logic.

---

# 5. Complete Workflow

User

↓

RequirementAgent

↓

StoryRequirements

↓

PlannerAgent

↓

StoryPlan

↓

ResearchAgent

↓

ResearchPackage

↓

StoryAgent

↓

StoryDraft

↓

CriticAgent

↓

FinalStory

↓

SceneAgent

↓

StoryScenes

---

# 6. Package Structure

packages/

agent-sdk/

workflow-engine/

llm-client/

prompt-manager/

requirement-agent/

planner-agent/

research-agent/

story-agent/

critic-agent/

scene-agent/

shared/

---

# 7. Agent Structure

Every agent MUST follow:

src/

agents/

models/

services/

tests/

index.ts

No exceptions.

---

# 8. Agent Lifecycle

Every agent executes:

Receive Input

↓

Compile Prompt

↓

Call LLM

↓

Parse JSON

↓

Validate

↓

Store Memory

↓

Return Output

---

# 9. Memory Keys (Frozen)

storyRequirements

storyPlan

researchPackage

storyDraft

finalStory

storyScenes

Never invent new keys unless approved.

---

# 10. Execution Memory

Execution memory is temporary.

Workflow Starts

↓

MemoryStore

↓

All Agents

↓

Workflow Ends

↓

Memory Destroyed

Execution Memory is NOT PostgreSQL.

---

# 11. Persistent Storage

Introduced after all agents.

Database

PostgreSQL

Tables

projects

workflow_runs

stories

feedback

prompt_versions

agent_logs

---

# 12. Prompt Architecture

Every prompt contains:

Role

Objective

Input

Output JSON

Rules

Examples (later)

Return JSON Only

Every prompt follows the same template.

---

# 13. LLM Architecture

Agent

↓

PromptManager

↓

LLMClient Interface

↓

GeminiClient

↓

Google Gemini

Never call Google SDK directly from agents.

---

# 14. Workflow Engine

Workflow Engine responsibilities:

• Create Memory

• Create Agents

• Execute Agents

• Handle Failures

• Collect Metrics

• Return Final Result

Application only calls:

workflow.run()

Never individual agents.

---

# 15. Logging

Every agent logs:

Started

Completed

Failed

Execution Time

No console.log except debugging.

Use Logger.

---

# 16. Error Handling

Every failure returns:

success

error

logs

metrics

Workflow Engine decides:

Retry

Continue

Stop

---

# 17. Coding Standards

Use

strict TypeScript

Dependency Injection

Interfaces

Small Classes

No God Objects

No Circular Dependencies

Meaningful Names

---

# 18. Definition of Done

A task is complete only when:

✓ Typecheck passes

✓ Build passes

✓ Integration Test passes

✓ Prompt registered

✓ Memory updated

✓ Logging works

✓ Blueprint updated

✓ Git Commit created

---

# 19. Roadmap

Phase 1

✓ Monorepo

✓ Agent SDK

✓ Prompt Manager

✓ LLM Client

---

Phase 2

✓ RequirementAgent

✓ PlannerAgent

---

Phase 3

Workflow Engine

---

Phase 4

ResearchAgent

StoryAgent

CriticAgent

SceneAgent

---

Phase 5

PostgreSQL

REST API

---

Phase 6

React

Authentication

Dashboard

Story Editor

---

Phase 7

Docker

CI/CD

Deployment

---

# 20. Frozen Rules

No architecture redesign.

No package responsibility changes.

No new memory keys.

No agent coupling.

Only bug fixes and feature implementation.

Blueprint Version = 1.0 (Frozen)