import { JsonParser } from "@storyforge/llm-client";
import { Adventure } from "../models/Adventure";
import { AIServices } from "./AIServices";
import { ADVENTURE_METADATA_SCHEMA } from "./adventureMetadataSchema";

const DEBUG_RAW_RESPONSE = process.env.LLM_DEBUG_RAW_RESPONSE === "true";

export interface GenerateMetadataInput {

    childId: string;

    childName: string;

    ageRange: string;

    aboutChild?: string;

    location: string;

    moral: string;

    domain: string;

}

export interface GenerateMetadataOptions {

    knowledgeContext?: string;

}

interface MetadataLLMOutput {

    title: string;

    characters: Adventure["characters"];

    world: Adventure["world"];

    learningPlan: Adventure["learningPlan"];

    genome: Adventure["genome"];

    premise: string;

    initialProblem: string;

    plotOutline: Adventure["plotOutline"];

}

// Correction pass: the ONLY thing Gemini is asked to invent at
// adventure-creation time now -- title/characters/world/genome/
// premise. No node topology, no edges, no per-node anything. This is
// what let ADVENTURE_METADATA_SCHEMA drop the entire `nodes` array
// that both caused a live "too many states for serving" 400 and made
// unreachable-node generation possible in the first place (a global
// graph-connectivity invariant free-form generation cannot
// guarantee). Structure is built afterward by InitialStoryBuilder,
// deterministically, with zero further LLM involvement.
export class AdventureMetadataGenerator {

    constructor(
        private readonly ai: AIServices
    ) {}

    async generate(
        input: GenerateMetadataInput,
        options?: GenerateMetadataOptions
    ): Promise<Omit<Adventure, "id" | "childId" | "rootNodeId" | "createdAt">> {

        const prompt = this.ai.promptManager.compile(
            "adventure-metadata",
            {
                childName: input.childName,
                ageRange: input.ageRange,
                aboutChild: input.aboutChild?.trim() || "none provided",
                location: input.location,
                moral: input.moral,
                knowledgeContext: options?.knowledgeContext ?? "(none)"
            }
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json",

            responseSchema: ADVENTURE_METADATA_SCHEMA,

            metadata: { caller: "AdventureMetadataGenerator", purpose: "generate_adventure_metadata" }

        });

        if (DEBUG_RAW_RESPONSE) {

            console.log(
                "\n===== AdventureMetadataGenerator: raw LLM response (LLM_DEBUG_RAW_RESPONSE=true) =====\n" +
                response.text +
                "\n===== end raw response =====\n"
            );

        }

        let output: MetadataLLMOutput;

        try {

            output = JsonParser.parse<MetadataLLMOutput>(response.text);

        }
        catch (error) {

            console.error(
                "\n===== AdventureMetadataGenerator: JsonParser.parse() failed =====\n" +
                (error instanceof Error ? error.message : String(error))
            );

            throw new Error(
                `AdventureMetadataGenerator: Invalid JSON response.\n${error}`
            );

        }

        this.validateShape(output);

        return {

            title: output.title,

            moral: input.moral,

            domain: input.domain,

            characters: output.characters,

            world: output.world,

            learningPlan: output.learningPlan,

            genome: output.genome,

            premise: output.premise,

            initialProblem: output.initialProblem,

            plotOutline: output.plotOutline

        };

    }

    private validateShape(
        output: MetadataLLMOutput
    ): void {

        if (!output.title) {
            throw new Error("Metadata output missing title.");
        }

        if (!Array.isArray(output.characters) || output.characters.length === 0) {
            throw new Error("Metadata output missing characters.");
        }

        if (!output.world?.setting) {
            throw new Error("Metadata output missing world.");
        }

        if (!Array.isArray(output.learningPlan) || output.learningPlan.length === 0) {
            throw new Error("Metadata output missing learningPlan.");
        }

        if (!output.genome?.theme) {
            throw new Error("Metadata output missing genome.");
        }

        if (!output.premise) {
            throw new Error("Metadata output missing premise.");
        }

        if (!output.initialProblem) {
            throw new Error("Metadata output missing initialProblem.");
        }

        if (!Array.isArray(output.plotOutline) || output.plotOutline.length !== 5) {
            throw new Error("Metadata output missing a well-formed 5-beat plotOutline.");
        }

    }

}
