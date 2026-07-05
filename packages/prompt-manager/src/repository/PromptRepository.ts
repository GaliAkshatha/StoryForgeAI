import { PromptTemplate } from "../models/PromptTemplate";

export class PromptRepository {

    private readonly prompts = new Map<
        string,
        PromptTemplate
    >();

    register(
        prompt: PromptTemplate
    ) {

        this.prompts.set(
            prompt.id,
            prompt
        );

    }

    get(
        id: string
    ): PromptTemplate {

        const prompt = this.prompts.get(id);

        if (!prompt) {

            throw new Error(
                `Prompt '${id}' not found.`
            );

        }

        return prompt;

    }

}