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