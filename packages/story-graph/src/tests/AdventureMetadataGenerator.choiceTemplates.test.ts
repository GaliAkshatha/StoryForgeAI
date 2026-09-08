import { AdventureMetadataGenerator } from "../services/AdventureMetadataGenerator";
import { DefaultPromptManager, createPromptRepository } from "@storyforge/prompt-manager";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";

// The real bug reported: choiceTemplates were generated, but NEVER
// actually reached ChoiceTextBuilder -- every choice fell back to
// the generic hardcoded default ("Share something with X"), because
// sanitizeChoiceTemplates required one exact byte-for-byte
// placeholder token ("{target}") and rejected anything else,
// including entirely realistic LLM output like "{Target}" or a
// missing marker on one field. This test proves the fix: tolerant
// normalization instead of exact-match rejection, and that a SINGLE
// malformed field doesn't take down the whole set.

function metadataResponseWith(choiceTemplates: Record<string, string>): string {

    return JSON.stringify({

        title: "The Pirate Cove",

        characters: [{ id: "captain", name: "Captain Barnaby", role: "guide", description: "A gruff pirate captain." }],

        world: { setting: "pirate cove", description: "A rocky cove full of shipwrecks." },

        learningPlan: [{ skillFocus: "honesty", approach: "natural consequence" }],

        genome: {
            theme: "honesty", explorationLevel: 0.6, humor: 0.3, mystery: 0.4,
            fantasyDensity: 0.5, puzzleDensity: 0.2, npcComplexity: 0.3, vocabulary: "simple"
        },

        premise: "a shattered telescope rolls across the dock",

        initialProblem: "a shattered telescope needs explaining",

        plotOutline: [
            { beat: "hook", summary: "a friend needs help" },
            { beat: "complication", summary: "it gets harder" },
            { beat: "moral_fork", summary: "decide whether to admit a mistake" },
            { beat: "test", summary: "someone learns what really happened" },
            { beat: "resolution", summary: "trust is rebuilt" }
        ],

        choiceTemplates

    });

}

class FixedResponseLLMClient implements LLMClient {

    constructor(private readonly text: string) {}

    async generate(_request: LLMRequest): Promise<LLMResponse> {

        return { text: this.text, model: "fake-model", finishReason: "STOP" };

    }

}

async function main(): Promise<void> {

    const promptManager = new DefaultPromptManager(createPromptRepository());

    // --- Realistic, imperfect LLM output: mixed placeholder casing,
    // one field with no placeholder at all where one IS required.
    // The old exact-match validation rejected ALL of these. ---

    {

        const generator = new AdventureMetadataGenerator({

            llmClient: new FixedResponseLLMClient(metadataResponseWith({

                helped_npc: "Help {Target} search the wreck",
                asked_questions: "Ask {TARGET} what happened",
                shared_resources: "Offer {target} some rope",
                led_team: "Take the lead", // missing required placeholder -- should be dropped
                solved_puzzle: "Try to piece it together",
                failed_puzzle: "Give it a go",
                retried: "Try again",
                ignored_warning: "Press on anyway",
                explored: "Scout the shoreline",
                observed: "Look closer at the wreckage"

            })),

            promptManager

        });

        const result = await generator.generate({

            childId: "child-1", childName: "Maya", ageRange: "7-9",
            location: "a pirate cove", moral: "honesty", domain: "ethics"

        });

        console.assert(
            result.choiceTemplates?.helped_npc === "Help {target} search the wreck",
            `Expected mixed-case {Target} to normalize to {target}, got '${result.choiceTemplates?.helped_npc}'`
        );

        console.assert(
            result.choiceTemplates?.asked_questions === "Ask {target} what happened",
            `Expected {TARGET} to normalize to {target}, got '${result.choiceTemplates?.asked_questions}'`
        );

        console.assert(
            result.choiceTemplates?.led_team === undefined,
            `Expected led_team to be dropped (missing required placeholder), got '${result.choiceTemplates?.led_team}'`
        );

        console.assert(
            result.choiceTemplates?.explored === "Scout the shoreline",
            `Expected a valid no-target template to survive, got '${result.choiceTemplates?.explored}'`
        );

        console.assert(
            Object.keys(result.choiceTemplates ?? {}).length === 9,
            `Expected 9 of 10 templates to survive (only led_team dropped), got ${Object.keys(result.choiceTemplates ?? {}).length}`
        );

    }

    // --- choiceTemplates entirely absent from the response -- must
    // not throw, whole adventure generation still succeeds. ---

    {

        const responseWithoutTemplates = JSON.parse(metadataResponseWith({}));

        delete responseWithoutTemplates.choiceTemplates;

        const generator = new AdventureMetadataGenerator({

            llmClient: new FixedResponseLLMClient(JSON.stringify(responseWithoutTemplates)),

            promptManager

        });

        const result = await generator.generate({

            childId: "child-1", childName: "Maya", ageRange: "7-9",
            location: "a pirate cove", moral: "honesty", domain: "ethics"

        });

        console.assert(
            result.choiceTemplates === undefined,
            "Expected undefined (not a throw) when choiceTemplates is entirely absent"
        );

        console.assert(
            result.title === "The Pirate Cove",
            "Expected the rest of adventure generation to succeed regardless"
        );

    }

    console.log("AdventureMetadataGenerator choiceTemplates tests passed.");

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
