import { TextRenderer, RenderRequest, RenderResult } from "./TextRenderer";

// Phase M: the ONE place that decides trivial-vs-rich. Never hidden
// -- every decision is logged with the reason, so "why did this call
// Gemini" is always answerable from logs, same spirit as
// LLMInstrumentation.
export class LanguageRouter implements TextRenderer {

    constructor(
        private readonly templateRenderer: TextRenderer,
        private readonly geminiRenderer: TextRenderer
    ) {}

    async render(
        request: RenderRequest
    ): Promise<RenderResult> {

        const useTemplate = request.complexity === "trivial";

        console.log(
            "\n===== LANGUAGE ROUTER =====\n" +
            `eventType: ${request.eventType}\n` +
            `rendererSelected: ${useTemplate ? "template" : "gemini"}\n` +
            `reason: complexity=${request.complexity}\n` +
            "============================\n"
        );

        return useTemplate
            ? this.templateRenderer.render(request)
            : this.geminiRenderer.render(request);

    }

}
