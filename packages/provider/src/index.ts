// @deprecated Phase O (deterministic-first migration audit): confirmed
// zero references anywhere else in the monorepo. GeminiProvider.ts,
// OllamaProvider.ts, and ProviderFactory.ts are all empty files --
// this package was superseded by @storyforge/llm-client's
// LLMClientFactory before it was ever wired up. Kept (not deleted)
// only because deleting a whole package is a bigger, less reversible
// action than the migration's "delete only when safe" guidance
// warrants doing unprompted; safe to remove entirely in a future
// cleanup pass.
export * from "./interfaces/LLMProvider";
