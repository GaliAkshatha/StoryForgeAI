import { PromptManager } from "../interfaces/PromptManager";
import { PromptRepository } from "../repository/PromptRepository";

export class DefaultPromptManager implements PromptManager {

    constructor(
        private readonly repository: PromptRepository
    ) {}

    compile(
        templateId: string,
        variables: Record<string, string>
    ): string {

        const template =
            this.repository.get(templateId);

        let prompt = template.template;

        for (const [key, value] of Object.entries(variables)) {

            const placeholder = `{{${key}}}`;

            prompt = prompt.replaceAll(
                placeholder,
                value
            );

        }

        return prompt;

    }

}