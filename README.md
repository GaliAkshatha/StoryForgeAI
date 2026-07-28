# StoryForge AI

## Status

🚧 Under Development — Phases 1-6 plus the v2.0 and v3 upgrades are in (see below). This round's focus was **completing and verifying** the v3 Story Graph migration: `EmotionRepository`/`NpcMemoryRepository`/`AchievementRepository` (Postgres + in-memory), the named `story-graph` service classes (`GraphTraversalEngine`, `AdventureCompiler`, `GraphSerializer`, `GraphLoader`), full dependency injection wiring, and root workspace scripts.

**Verified with the real `pnpm` toolchain (not just manual `tsc`):** `pnpm install`, `pnpm typecheck` (23/23 packages, zero errors), and `pnpm build` (22/23 packages, including a real Vite production build for `ui`) all succeed. The **only** thing that doesn't complete is `packages/database`'s `prisma generate` step, because Prisma's engine binaries are hosted at `binaries.prisma.sh`, which this sandboxed environment's network policy blocks (403 Forbidden) — this has been true and documented since early in this project's history, is not a code defect, and is fully resolved by running `pnpm db:generate` once on a machine with normal network access. Every other package, including everything that depends on `@storyforge/database`, was verified to typecheck and build correctly against a hand-written structural stand-in for the generated client (used only for local verification, never shipped).

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

`requirement-agent`, `planner-agent`, `research-agent` (grounded via `knowledge-engine` when a `KnowledgeBase` is wired), `story-agent`, `critic-agent`, `reflection-agent` (v3: runs once per chapter end, not every turn), `analytics-agent` (v3: only writes a plain-language explanation of already-computed scores, never invents them).

### Story Graph (v3)

- `story-graph` — the graph-based runtime that replaced per-turn generation. `AdventureCompiler` (generate + validate + persist in one call) wraps `AdventureBlueprintGenerator`, which does ONE expensive generation up front (or occasionally again, via `expandFrom`, when the graph is running low — `GraphValidator` checks every generated batch for dangling edges/unreachable nodes/bad endings before anything persists), producing an `Adventure` (title, characters, world, learning plan, `StoryGenome`) plus many `StoryNode`s (narrative, exactly 4 `StoryChoice` edges, `effects`, an `EmotionProfile`, an optional `eventType` tag). Gameplay afterward is `GraphTraversalEngine` walking `AdventureRepository`/`StoryNodeRepository` plus the same `DeterministicSimulator` from v2 — zero LLM calls per turn. `StoryEdge`/`DerivedStoryEdgeRepository` is a normalized read-side view over the same `StoryChoice` data (not a second table). `GraphSerializer`/`GraphLoader` export/import a full compiled graph as portable JSON. `AdventureEvent`s are derived deterministically from each node's `eventType` and feed the Reflection/Analytics Engines below; `EmotionTracker`/`EmotionRepository` record every turn's emotion for trend-based adaptation; `NpcMemoryRepository` logs a human-readable trail behind `WorldState.relationships`' numeric trust/affinity; `AchievementRepository` holds deterministically-unlocked milestones.

### Learning Platform

- `identity` — `User`, `AuthService` (register/login/JWT session verify/`changePassword`), `PasswordHasher` (bcrypt, 12 rounds). Sessions are stateless JWTs -- `logout` is a documented no-op (see the service's own comments) since true revocation needs a persisted denylist this phase doesn't add
- `parent` — `ParentProfile`, settings, child-linking, `ParentService` (including `updateProfile` for the account page)
- `child` — `ChildProfile` (including optional `aboutChild` free-form personalization notes), adventure history, `ChildService`
- `learning` — `WeeklyReport` / `SkillGrowthPoint` / `LearningRecommendation`, aggregated **deterministically** (counting/averaging only) from `LearningAnalytics` — no LLM in this path, so there's no route to personality diagnosis. `getWeeklyTrend` buckets the same data over the last 8 weeks for the dashboard's trend charts. **v3: `DeterministicAnalyticsEngine`** scores the 14 canonical traits (leadership, curiosity, creativity, communication, problem-solving, empathy, persistence, collaboration, observation, critical thinking, risk assessment, initiative, responsibility, decision confidence) mathematically from collected `AdventureEvent`s via a fixed event→trait weight table — no LLM involved in the scoring itself, only in the (separate, `analytics-agent`) explanation of what the numbers already say. Two other LLM-assisted services, both strictly grounded in data the caller provides: `LearningGoalService` (parent free-form goal → structured objective) and `LearningSummaryService` (weekly trend → parent-facing summary)
- `database` — Prisma schema + PostgreSQL-backed implementations of the repository interfaces above, including v3's `AdventureRecord`/`StoryNodeRecord`/`AdventureEventRecord`. The in-memory implementations still exist in their domain packages for local dev/tests without a database (`PERSISTENCE=memory`)
- `api` — Express server: `AppContainer` composition root + REST routes for auth (including `GET /auth/me` for session restore and `POST /auth/change-password`), parent profile (`PATCH /parents/me`), children, adventures, and reports (including `GET /reports/:childId/trend`)

### Frontend (`ui`)

Vite + React + TypeScript + Tailwind, route-level code-split (`React.lazy`). Fantasy-themed, animated, with **Ember** — a persistent guide character who narrates contextual tips through every screen. Three experiences: "The Study" (parent dashboard — now a responsive 12-column, near-full-width grid; storybook-shelf child list, sparkline trend chart + AI-generated summary, weekly report with a "View Details" expand, create-child form with an optional "about your child" field), "The Storybook" (child adventure loop — narrative + exactly 4 animated choice cards, matching v3's graph-based backend contract: `isEnding`/optional `reflection`/`analytics` only appear on the turn that actually concludes a chapter; narrative uses a dedicated highly-readable font, separate from the fantasy display face used only for titles; includes `NarrationControls`, a working Web Speech API narrator with sentence highlighting, auto-scroll, and persisted voice/speed/pitch preferences behind a swappable `TTSProvider` abstraction), and an account **Profile page**. An `AccessibilityMenu` (high contrast / dyslexia font / reduced motion, persisted) is available on every screen. The session persists across page reloads by re-verifying the JWT against `GET /auth/me` on load.

### Not yet started / honest simplifications

**Still not started:** weekly report emails, token revocation before natural expiry (JWTs are stateless), email verification / forgot-password.

**v3, implemented but deliberately scoped down given time:**
- **Emotion Engine** — adapts the *next generated chapter's* difficulty/tone via a prompt note (real, tested), not live mid-chapter difficulty changes (the current chapter's nodes are already generated).
- **Memory Engine** — NPCs reference established trust/affinity in newly *generated* chapters; existing already-generated nodes don't retroactively change.
- **Goal Planner** — `GOAL_HIERARCHY` covers 4 top-level goals (leadership, problem_solving, empathy, persistence) as a starting set, not all 14 traits exhaustively decomposed.
- **Parent Feedback Loop** — collection (model + repository) is real; there's no API route or frontend prompt wired up yet, and feedback doesn't yet weight future recommendations.
- **Dashboard redesign** — real 12-column responsive grid, near-full-width layout, and a working "View Details" expand/collapse on the weekly report card. Not built: skill radar chart, weekly heatmap, progress rings, achievement timeline, learning tree, streak calendar (the sparkline trend chart from v2.0 remains the primary visualization).
- **Story Reader / narration** — fully working Web Speech API implementation (read/pause/resume/replay, sentence highlighting, auto-scroll, voice/speed/pitch controls, persisted preferences) behind a real `TTSProvider` abstraction, exactly as asked, so a premium provider is a one-line swap later.
- **Accessibility** — high contrast, dyslexia-friendly font, and a manual reduced-motion toggle are real and persisted. Keyboard navigation and large click targets were already true structurally (real `<button>`s throughout). Caption mode wasn't built as a separate feature since the app is text-first already (narration never hides the text).
- **Adventure Save System** — "save at every node" was already true from v3 Phase 1-2 (`WorldState.currentNodeId` persists after every turn); added `GET /adventures/:worldId/state` (resume) and `GET /adventures/:worldId/history` (turn-by-turn transcript for a timeline view) plus the matching API client method. **Not built**: the frontend UI to list a child's in-progress adventures and resume one — `AdventurePage` still always starts a fresh adventure.
- **Performance** — real route-level code splitting (`React.lazy`, verified in the production build: `AdventurePage`/`ParentDashboardPage`/etc. are now separate downloaded chunks) and a memoized dashboard computation. **Not built**: history virtualization, node/image prefetching (graph caching was already inherent to Part 1's persistence).
- **Story Genome** — generated and persisted alongside every adventure blueprint; not yet *read* anywhere (no caching/recommendation logic consumes it yet).
- **NPC Memory / Achievements (this round)** — both persist and are actively written by `AdventureRuntime` (relationship-change turns log NPC memory entries; chapter-end runs a real, deterministic, reproducible achievement-unlock check). Not built: a frontend UI to display either one, and the achievement rule set is intentionally small (2 rules: first-chapter-complete, and a "strong showing" per trait) rather than an elaborate progression system.
- **Emotion history (this round)** — `EmotionRepository` now records every turn's emotion (previously only `AdventureEvent`-tagged turns had a snapshot), read by the same `EmotionTrendService` math as before. No new frontend surface for it yet.

**Part 16 (provider abstraction):** already satisfied since the v2.0 upgrade — `LLMClientFactory` is still the only place that knows a concrete provider exists; nothing in v3 touched this.

**Real toolchain verification (this round):** `pnpm install`, `pnpm typecheck` (23/23), and `pnpm build` (22/23) were run for real via the actual `pnpm` CLI, not simulated. The lone gap is `packages/database`'s `prisma generate` step, blocked purely by this sandbox's network policy (see "Database" below) — not a code defect, and confirmed not to affect anything else in the workspace.

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

Run the whole workspace from the root:

```
pnpm install
pnpm typecheck   # all 23 packages, zero errors
pnpm build       # 22/23 -- see "Database" below for the one exception
pnpm dev         # runs @storyforge/api and @storyforge/ui together
```

Or individually:

```
pnpm --filter @storyforge/api dev
pnpm --filter @storyforge/ui dev
```

### Database

PostgreSQL via Prisma is the default persistence layer (`PERSISTENCE=postgres`, requires `DATABASE_URL`). To set it up:

```
pnpm db:generate
pnpm db:migrate
```

`prisma generate` downloads Prisma's query-engine binary from `binaries.prisma.sh`, so it needs unrestricted network access. **This is the one command in the entire workspace that could not be run in the sandboxed environment this repo was built in** (403 Forbidden from that domain) — every other package, including everything that imports `@storyforge/database`, was verified to typecheck and build correctly regardless (see "Status" above). Run `pnpm db:generate` once after cloning, in an environment with normal network access, before `pnpm build` will fully succeed.

For local dev/tests without a database, set `PERSISTENCE=memory` — this uses the original in-memory repositories (still present in each domain package) and resets on every restart.

## Package manager

This is a pnpm workspace (`pnpm-workspace.yaml`). See the root `package.json` for the `build`/`dev`/`typecheck`/`test` scripts, or target one package with `pnpm --filter <package> <script>`.
