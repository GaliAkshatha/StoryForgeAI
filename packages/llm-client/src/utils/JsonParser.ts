export class JsonParser {

    static parse<T>(
        text: string
    ): T {

        const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();

        return JSON.parse(cleaned) as T;

    }

}