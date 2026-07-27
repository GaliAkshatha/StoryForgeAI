// Parses JSON out of an LLM response. Even with responseSchema-based
// constrained decoding (see GeminiClient/OllamaClient), defense in
// depth is worth it here: a stray markdown fence, a preamble
// sentence, or a raw (unescaped) newline inside a string value are
// all common LLM output failure modes that would otherwise throw a
// bare, hard-to-diagnose JSON.parse SyntaxError.
export class JsonParser {

    static parse<T>(
        text: string
    ): T {

        const stripped = JsonParser.stripCodeFences(text);

        try {

            return JSON.parse(stripped) as T;

        }
        catch {

            // Fall through to repair attempts below.

        }

        const repaired = JsonParser.repair(stripped);

        try {

            return JSON.parse(repaired) as T;

        }
        catch (error) {

            const snippet = stripped.length > 400
                ? `${stripped.slice(0, 400)}...`
                : stripped;

            throw new Error(
                `JsonParser: could not parse a valid JSON object from the model's response, ` +
                `even after repair. Underlying error: ${error instanceof Error ? error.message : error}\n` +
                `Raw response (first 400 chars): ${snippet}`
            );

        }

    }

    private static stripCodeFences(
        text: string
    ): string {

        let result = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();

        // Models sometimes add a sentence of preamble/postamble
        // despite "Return ONLY JSON" instructions. If the text isn't
        // already a clean {...} or [...] object, extract the
        // outermost JSON-looking span as a best effort.
        if (!/^[{[]/.test(result)) {

            const start = result.search(/[{[]/);

            const end = Math.max(
                result.lastIndexOf("}"),
                result.lastIndexOf("]")
            );

            if (start !== -1 && end !== -1 && end > start) {
                result = result.slice(start, end + 1);
            }

        }

        return result;

    }

    // Escapes raw control characters (newline, carriage return, tab)
    // that appear INSIDE string literals -- valid JSON requires
    // these to be written as \n, \r, \t, but models writing
    // multi-sentence narrative text into a JSON string frequently
    // emit a literal line break instead. This is done with a single
    // pass that tracks whether we're inside a string (toggling on
    // unescaped double quotes) so it never touches structural
    // whitespace between tokens.
    private static repair(
        text: string
    ): string {

        let result = "";

        let insideString = false;

        let previousChar = "";

        for (const char of text) {

            if (insideString) {

                if (char === "\n") {
                    result += "\\n";
                    previousChar = char;
                    continue;
                }

                if (char === "\r") {
                    result += "\\r";
                    previousChar = char;
                    continue;
                }

                if (char === "\t") {
                    result += "\\t";
                    previousChar = char;
                    continue;
                }

            }

            if (char === "\"" && previousChar !== "\\") {
                insideString = !insideString;
            }

            // An escaped backslash ("\\\\") must not make the
            // following character look escaped -- reset instead of
            // leaving previousChar as "\\" after a literal backslash
            // pair.
            previousChar = char === "\\" && previousChar === "\\" ? "" : char;

            result += char;

        }

        return result;

    }

}
