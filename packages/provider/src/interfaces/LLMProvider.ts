export interface GenerateRequest {

    prompt: string;

    responseFormat?: "text" | "json";

}

export interface GenerateResponse {

    text: string;

}

export interface LLMProvider {

    generate(

        request: GenerateRequest

    ): Promise<GenerateResponse>;

}