import { JsonParser } from "@storyforge/llm-client";
import { AdventureEventType } from "@storyforge/shared";
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

    choiceTemplates?: Partial<Record<AdventureEventType, string>>;

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

            plotOutline: output.plotOutline,

            choiceTemplates: this.sanitizeChoiceTemplates(output.choiceTemplates)

        };

    }

    // Deliberately per-field, non-throwing: a malformed choice
    // template (wrong placeholder presence, too long) drops just
    // that ONE type, falling back to ChoiceTextBuilder's own
    // hardcoded default for it -- never fails the whole adventure
    // over an imperfect button phrase. Placeholder-presence is
    // checked exactly (a simple string search, not fragile NLP)
    // since that's a structural requirement, not a judgment call.
    private static readonly TARGET_REQUIRING_TYPES: AdventureEventType[] = [
        "helped_npc", "asked_questions", "shared_resources", "led_team"
    ];

    private sanitizeChoiceTemplates(
        raw: Partial<Record<AdventureEventType, string>> | undefined
    ): Partial<Record<AdventureEventType, string>> | undefined {

        if (!raw) {

            console.warn(
                "\n===== AdventureMetadataGenerator: choiceTemplates entirely missing from LLM output " +
                "-- falling back to hardcoded choice text for every event type this adventure ====="
            );

            return undefined;

        }

        const sanitized: Partial<Record<AdventureEventType, string>> = {};

        const rejected: string[] = [];

        for (const type of Object.keys(raw) as AdventureEventType[]) {

            const value = raw[type];

            if (typeof value !== "string") {
                rejected.push(`${type}: not a string`);
                continue;
            }

            // Real-world tolerance: normalize whatever bracket-style
            // placeholder the model actually wrote ("{target}",
            // "{Target}", "{TARGET}", "{name}") to the canonical
            // "{target}" ChoiceTextBuilder expects, instead of
            // requiring one exact byte-for-byte token -- an LLM
            // reliably writing SOME placeholder is realistic; writing
            // that EXACT string every time is not, and treating the
            // latter as a hard requirement was silently discarding
            // almost everything.
            const normalized = value.trim().replace(/\{\s*(target|name)\s*\}/gi, "{target}");

            const wordCount = normalized.split(/\s+/).filter(Boolean).length;

            if (normalized.length === 0 || normalized.length > 60 || wordCount > 8) {
                rejected.push(`${type}: wrong length ("${value}")`);
                continue;
            }

            const requiresTarget = AdventureMetadataGenerator.TARGET_REQUIRING_TYPES.includes(type);

            const hasPlaceholder = normalized.includes("{target}");

            if (requiresTarget && !hasPlaceholder) {
                rejected.push(`${type}: missing required {target} ("${value}")`);
                continue;
            }

            if (!requiresTarget && hasPlaceholder) {
                // Safe to just strip it rather than reject outright --
                // a stray placeholder on a no-target type is a minor
                // model slip, not a structural break like the reverse
                // case (a missing placeholder means the target can
                // never be named at all).
                sanitized[type] = normalized.replace("{target}", "").replace(/\s{2,}/g, " ").trim();
                continue;
            }

            sanitized[type] = normalized;

        }

        if (rejected.length > 0) {

            console.warn(
                "\n===== AdventureMetadataGenerator: some choiceTemplates rejected, falling back to " +
                "hardcoded defaults for these types =====\n" +
                rejected.join("\n") +
                "\n=========================================================================================\n"
            );

        }

        return Object.keys(sanitized).length > 0 ? sanitized : undefined;

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
