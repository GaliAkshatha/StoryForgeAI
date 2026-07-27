# StoryForge AI

## Status

🚧 Under Development — Phases 1-6 of the original build plus the v2.0 upgrade (provider-agnostic LLM, PostgreSQL persistence, bcrypt+JWT auth with a full account/profile flow, choice-based turns, parent learning goals + child personalization, and richer dashboard trends/AI summaries) are in. See "Not yet started" below for what's left.

StoryForge is an AI-powered Adaptive Learning Platform where parents manage learning and children learn through interactive narrative experiences. See `MASTER_PROMPT.md` for the original product vision and `docs/` (or the v2.0 upgrade brief, if kept alongside this repo) for the provider/persistence/UX upgrade.

## Packages

### AI Platform

- `agent-sdk` — shared base for all agents (`BaseAgent`, logging, validation, in-memory `MemoryClient`)
- `llm-client` — `LLMClient` interface with `GeminiClient` (default provider, `gemini-2.5-flash`) and `OllamaClient` (optional, for local/offline use) implementations, selected by `LLMClientFactory` -- the *only* place in the codebase that knows both exist. No agent, prompt, or service ever branches on which provider is active.
- `prompt-manager` — versioned prompt templates, one per agent/engine
- `knowledge-engine` — Knowledge domain: Hybrid RAG. `OllamaEmbeddingClient` (nomic-embed-text -- always Ollama, regardless of `LLM_PROVIDER`, since Gemini doesn't serve this model) + `ChromaVectorStore`/`InMemoryVectorStore` (dense) + `BM25Index` (sparse) fused via `ReciprocalRankFusion`, exposed through the `KnowledgeBase` facade
- `simulation-engine` — Simulation domain: `WorldState` (source of truth, includes the adventure's `moral`/`domain` and the live `currentNarrative`/`currentChoices`), `DeterministicSimulator` (the only component allowed to mutate it), `ConsequenceEngine` (LLM proposes effects + narrative + the next 4 choices + `learningSignals` tags; simulator validates/applies), and `StoryTurn` (persisted per-turn transcript feeding the Analytics Agent). `WorldStateStore` and `StoryTurnRepository` are interfaces with in-memory and Postgres-backed implementations
- `workflow-engine` — `DependencyContainer` (wires everything via DI, provider- and persistence-agnostic), `WorkflowRuntime` (linear story-generation pipeline), `AdventureRuntime` (interactive Core Loop: choice selection → Consequence Engine → Hybrid RAG → Reflection → Analytics, returning the next narrative + exactly 4 choices)

### AI Agents

`requirement-agent`, `planner-agent`, `research-agent` (grounded via `knowledge-engine` when a `KnowledgeBase` is wired), `story-agent`, `critic-agent`, `reflection-agent`, `analytics-agent`.

### Learning Platform

- `identity` — `User`, `AuthService` (register/login/JWT session verify/`changePassword`), `PasswordHasher` (bcrypt, 12 rounds). Sessions are stateless JWTs -- `logout` is a documented no-op (see the service's own comments) since true revocation needs a persisted denylist this phase doesn't add
- `parent` — `ParentProfile`, settings, child-linking, `ParentService` (including `updateProfile` for the account page)
- `child` — `ChildProfile` (including optional `aboutChild` free-form personalization notes), adventure history, `ChildService`
- `learning` — `WeeklyReport` / `SkillGrowthPoint` / `LearningRecommendation`, aggregated **deterministically** (counting/averaging only) from the Analytics Agent's `LearningAnalytics` — no LLM in this path, so there's no route to personality diagnosis. `getWeeklyTrend` buckets the same data over the last 8 weeks for the dashboard's trend charts. Two LLM-assisted services, both strictly grounded in data the caller provides (never raw transcripts): `LearningGoalService` converts a parent's free-form goal ("I want my daughter to understand honesty") into a structured `LearningObjective` before an adventure starts, and `LearningSummaryService` narrates the weekly trend into a parent-facing `LearningSummary` (headline, trend highlights, suggested next goal) — the child never sees either
- `database` — Prisma schema + PostgreSQL-backed implementations of the repository interfaces above. The in-memory implementations still exist in their domain packages for local dev/tests without a database (`PERSISTENCE=memory`)
- `api` — Express server: `AppContainer` composition root + REST routes for auth (including `GET /auth/me` for session restore and `POST /auth/change-password`), parent profile (`PATCH /parents/me`), children, adventures, and reports (including `GET /reports/:childId/trend`)

### Frontend (`ui`)

Vite + React + TypeScript + Tailwind. Fantasy-themed, animated, with **Ember** — a persistent guide character (`GuideCharacter`/`EmberSprite`) who narrates contextual tips through every screen. Three experiences: "The Study" (parent dashboard — storybook-shelf child list, weekly report, per-skill sparkline trend chart + AI-generated summary, create-child form with an optional "about your child" field), "The Storybook" (child adventure loop — narrative + exactly 4 animated choice cards, no free-text input; a parent free-form learning-goal field replaces the old direct "moral" entry, with the AI's derived objective shown as a one-time confirmation only the parent sees before the story begins), and an account **Profile page** (update name/settings, change password) reachable from the dashboard header. The session persists across page reloads by re-verifying the JWT against `GET /auth/me` on load.

### Not yet started

Weekly report emails, token revocation before natural expiry (JWTs are stateless — logout is a documented no-op), and email verification / forgot-password flows.

## Setup

```
cp .env.example .env
cp packages/ui/.env.example packages/ui/.env
```

Requires a local [Ollama](https://ollama.com) server with `qwen3` and `nomic-embed-text` pulled. ChromaDB is optional — the knowledge base falls back to an in-memory vector store if `CHROMA_BASE_URL` isn't reachable.

```
ollama pull qwen3
ollama pull nomic-embed-text
```

Run the API and frontend in separate terminals:

```
pnpm --filter @storyforge/api dev
pnpm --filter @storyforge/ui dev
```

### Database

PostgreSQL via Prisma is the default persistence layer (`PERSISTENCE=postgres`, requires `DATABASE_URL`). To set it up:

```
pnpm --filter @storyforge/database exec prisma generate
pnpm --filter @storyforge/database exec prisma migrate dev --name init
```

`prisma generate` downloads Prisma's query-engine binary, so it needs unrestricted network access — this couldn't be run in the sandboxed environment this repo was built in, so the generated client hasn't been committed. Run it once after cloning.

For local dev/tests without a database, set `PERSISTENCE=memory` — this uses the original in-memory repositories (still present in each domain package) and resets on every restart.

## Package manager

This is a pnpm workspace (`pnpm-workspace.yaml`). Install with `pnpm install`, build a package with `pnpm --filter <package> build`.
