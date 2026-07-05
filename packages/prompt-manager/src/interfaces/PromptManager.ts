export interface PromptManager {

    compile(
        templateId: string,
        variables: Record<string, string>
    ): string;

}