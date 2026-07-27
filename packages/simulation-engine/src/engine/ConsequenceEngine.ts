import { JsonParser } from "@storyforge/llm-client";

import { WorldState } from "../models/WorldState";
import { ChildDecision } from "../models/Decision";
import { Consequence } from "../models/Consequence";
import { StateEffect } from "../models/StateEffect";
import { Choice } from "../models/Choice";

import { DeterministicSimulator } from "./DeterministicSimulator";
import { AIServices } from "../services/AIServices";

const REQUIRED_CHOICE_COUNT = 4;

// The shape both prompts ("opening" and "consequence") are required
// to return. The LLM is only ever allowed to respond with this --
// it never sees or returns a WorldState directly.
interface ConsequenceLLMOutput {

    narrative: string;

    emotionalTone: string;

    choices: Choice[];

    learningSignals: string[];

    effects: StateEffect[];

}

// A JSON-Schema-shaped (OpenAPI subset) description of
// ConsequenceLLMOutput, passed as LLMRequest.responseSchema.
// GeminiClient forwards this into Gemini's constrained decoding
// (responseSchema + responseMimeType: "application/json"), which
// guarantees syntactically valid, schema-conformant JSON -- unlike
// responseMimeType alone, which only *asks* for JSON and can still
// come back with e.g. an unescaped raw newline inside a string
// value. OllamaClient forwards the same object as its `format`
// field, which Ollama (0.5+) also treats as a structured-output
// schema. Kept as a plain object (not importing @google/genai's
// `Type` enum here) so simulation-engine stays provider-agnostic --
// GeminiClient is the only place that casts this to the SDK's own
// Schema type.
const CONSEQUENCE_RESPONSE_SCHEMA = {

    type: "OBJECT",

    properties: {

        narrative: { type: "STRING" },

        emotionalTone: { type: "STRING" },

        choices: {

            type: "ARRAY",

            minItems: "4",

            maxItems: "4",

            items: {

                type: "OBJECT",

                properties: {

                    id: { type: "STRING" },

                    text: { type: "STRING" }

                },

                required: ["id", "text"]

            }

        },

        learningSignals: {

            type: "ARRAY",

            items: { type: "STRING" }

        },

        effects: {

            type: "ARRAY",

            items: {

                type: "OBJECT",

                properties: {

                    type: { type: "STRING" },

                    payload: { type: "OBJECT" }

                },

                required: ["type", "payload"]

            }

        }

    },

    required: ["narrative", "emotionalTone", "choices", "learningSignals", "effects"]

};

export interface ConsequenceEngineOptions {

    // Optional grounding text (e.g. from HybridRetriever) to keep the
    // reasoning consistent with the platform's knowledge base.
    knowledgeContext?: string;

}

export interface OpenAdventureInput {

    childName: string;

    ageRange: string;

    // Free-form parent notes personalizing theme, vocabulary,
    // characters, emotional tone, and quest difficulty. Optional;
    // never surfaced to the child, only used to shape narration.
    aboutChild?: string;

}

// Implements the Consequence Engine described in the Master Prompt:
// combines (1) deterministic simulation of inventory, relationships,
// economy, and quests with (2) LLM reasoning for believable
// reactions, emotional consequences, and narrative richness. The
// World State remains the source of truth throughout -- the LLM's
// output is treated as a proposal, never applied directly.
//
// v2.0: every LLM call here also returns the next 4 choices (the
// child never free-types again) and a short list of learningSignal
// tags describing what value the moment touched, without ever
// naming that value to the child -- "learning through story, never
// preaching" (Master Prompt point 8).
export class ConsequenceEngine {

    private readonly simulator = new DeterministicSimulator();

    constructor(
        private readonly ai: AIServices
    ) {}

    // Generates the opening scene for a brand new adventure. Called
    // once by AdventureRuntime.startAdventure, before any decision
    // exists.
    async openAdventure(
        state: WorldState,
        input: OpenAdventureInput,
        options?: ConsequenceEngineOptions
    ): Promise<Consequence> {

        const prompt = this.ai.promptManager.compile(
            "opening",
            {
                childName: input.childName,
                ageRange: input.ageRange,
                aboutChild: input.aboutChild?.trim() || "none provided",
                location: state.location,
                moral: state.moral,
                knowledgeContext: options?.knowledgeContext ?? "(none)"
            }
        );

        return this.callAndApply(state, prompt);

    }

    async resolve(
        state: WorldState,
        decision: ChildDecision,
        input: OpenAdventureInput,
        options?: ConsequenceEngineOptions
    ): Promise<Consequence> {

        const prompt = this.ai.promptManager.compile(
            "consequence",
            {
                childName: input.childName,
                ageRange: input.ageRange,
                aboutChild: input.aboutChild?.trim() || "none provided",
                moral: state.moral,
                worldState: JSON.stringify(state, null, 2),
                situationText: decision.situationText,
                optionText: decision.optionText,
                knowledgeContext: options?.knowledgeContext ?? "(none)"
            }
        );

        return this.callAndApply(state, prompt);

    }

    private async callAndApply(
        state: WorldState,
        prompt: string
    ): Promise<Consequence> {

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json",

            responseSchema: CONSEQUENCE_RESPONSE_SCHEMA

        });

        // Explicit, unconditional log of the raw model output right
        // before it's handed to JsonParser -- if parsing fails below,
        // this line (not just the thrown error's truncated snippet)
        // is what makes the failure diagnosable.
        console.log(
            "\n===== ConsequenceEngine: raw LLM response before JsonParser.parse() =====\n" +
            response.text +
            "\n===== end raw response =====\n"
        );

        let llmOutput: ConsequenceLLMOutput;

        try {

            llmOutput = JsonParser.parse<ConsequenceLLMOutput>(
                response.text
            );

        }
        catch (error) {

            console.error(
                "\n===== ConsequenceEngine: JsonParser.parse() failed =====\n" +
                (error instanceof Error ? error.message : String(error))
            );

            throw new Error(
                `ConsequenceEngine: Invalid JSON response.\n${error}`
            );

        }

        this.validateLLMOutput(llmOutput);

        // The DeterministicSimulator is the sole authority over the
        // WorldState. Whatever the LLM proposed is validated and
        // clamped here -- invalid proposals are silently dropped
        // rather than corrupting the world.
        const simulation = this.simulator.apply(
            state,
            llmOutput.effects
        );

        const worldStateAfter: WorldState = {

            ...simulation.state,

            currentNarrative: llmOutput.narrative,

            currentChoices: llmOutput.choices

        };

        return {

            narrative: llmOutput.narrative,

            emotionalTone: llmOutput.emotionalTone,

            choices: llmOutput.choices,

            learningSignals: llmOutput.learningSignals,

            effects: simulation.appliedEffects,

            worldUpdate: {

                effects: simulation.appliedEffects,

                turn: worldStateAfter.turn,

                location: worldStateAfter.location

            },

            worldStateAfter

        };

    }

    private validateLLMOutput(
        output: ConsequenceLLMOutput
    ): void {

        if (!output.narrative) {
            throw new Error("Consequence output missing narrative.");
        }

        if (!output.emotionalTone) {
            throw new Error("Consequence output missing emotionalTone.");
        }

        if (!Array.isArray(output.choices) || output.choices.length !== REQUIRED_CHOICE_COUNT) {

            throw new Error(
                `Consequence output must contain exactly ${REQUIRED_CHOICE_COUNT} choices, got ${output.choices?.length ?? 0}.`
            );

        }

        for (const choice of output.choices) {

            if (!choice.id || !choice.text) {

                throw new Error(
                    "Consequence output has a choice missing id or text."
                );

            }

        }

        if (!Array.isArray(output.learningSignals)) {
            throw new Error("Consequence output missing learningSignals array.");
        }

        if (!Array.isArray(output.effects)) {
            throw new Error("Consequence output missing effects array.");
        }

    }

}
