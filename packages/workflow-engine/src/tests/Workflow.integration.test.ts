import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { WorkflowBuilder } from "../builder/WorkflowBuilder";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({
    path: path.resolve(__dirname, "../../../../.env")
});

async function main() {

    const runtime =
        WorkflowBuilder.create({

            apiKey: process.env.GEMINI_API_KEY!,

            model: process.env.GEMINI_MODEL!

        });

    const result =
        await runtime.run({

            projectId: "demo",

            prompt:
                "I want a funny fantasy story about a lonely dragon who learns sharing."

        });

    console.log(
        "\n===== Workflow Result =====\n"
    );

    console.dir(
        result,
        {
            depth: null
        }
    );

}

main().catch(console.error);