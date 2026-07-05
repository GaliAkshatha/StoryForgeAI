import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GeminiClient } from "../clients/GeminiClient";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({
    path: path.resolve(__dirname, "../../../../.env")
});

async function main() {
    console.log("Gemini API Key Loaded:", !!process.env.GEMINI_API_KEY);
    console.log("Model:", process.env.GEMINI_MODEL);

    const client = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        model: process.env.GEMINI_MODEL!
    });

    const response = await client.generate({
        prompt: "Say hello in one sentence."
    });

    if (!response.text) {
        throw new Error("Gemini returned an empty response.");
    }

    console.log("✅ Gemini responded successfully.");
    console.log(response);
}

main().catch((error) => {
    console.error("Integration test failed:");
    console.error(error);
    process.exit(1);
});