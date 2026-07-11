import { LLMClient } from "../interfaces/LLMClient";
import { LLMConfig } from "../config/LLMConfig";
import { LLMRequest } from "../models/LLMRequest";
import { LLMResponse } from "../models/LLMResponse";

export class OllamaClient implements LLMClient {

    constructor(

        private readonly config: LLMConfig

    ) {}

    async generate(

        request: LLMRequest

    ): Promise<LLMResponse> {

        try {

            const response =
                await fetch(

                    "http://localhost:11434/api/generate",

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({

                            model:
                                this.config.model,

                            prompt:
                                request.prompt,

                            stream: false

                        })

                    }

                );

            if (!response.ok) {

                throw new Error(

                    `Ollama request failed: ${response.status}`

                );

            }

            const data =
                await response.json();

            return {

                text:
                    data.response,

                model:
                    this.config.model,

                finishReason:
                    "STOP"

            };

        }

        catch (error) {

            console.error(

                "\n===== OLLAMA ERROR =====\n"

            );

            console.dir(

                error,

                {

                    depth: null

                }

            );

            throw error;

        }

    }

}