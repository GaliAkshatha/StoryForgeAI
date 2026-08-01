// Phase 2B (Section K): a conservative safety net at the narration
// boundary -- catches obviously broken Gemini output (empty,
// truncated, suspiciously tiny) WITHOUT attempting real grammar
// detection. Deliberately simple, cheap heuristics only.
const MIN_WORD_COUNT = 3;

const TERMINAL_PUNCTUATION = /[.!?]["')]?$/;

export class NarrativeQualityGate {

    isAcceptable(
        text: string
    ): boolean {

        const trimmed = text.trim();

        if (trimmed.length === 0) {
            return false;
        }

        const words = trimmed.split(/\s+/).filter(word => word.length > 0);

        if (words.length < MIN_WORD_COUNT) {
            return false;
        }

        // Conservative truncation heuristic: a complete sentence
        // should end with terminal punctuation. This alone is what
        // catches "Ak gives Professor" / "Ak gently pushes the" /
        // "Ak bravely held" -- all missing both length AND a proper
        // ending, without needing any real grammar analysis.
        if (!TERMINAL_PUNCTUATION.test(trimmed)) {
            return false;
        }

        return true;

    }

}
