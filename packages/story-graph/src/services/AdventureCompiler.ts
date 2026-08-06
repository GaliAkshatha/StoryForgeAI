import {
    AdventureMetadataGenerator,
    GenerateMetadataInput,
    GenerateMetadataOptions
} from "./AdventureMetadataGenerator";

import { InitialStoryBuilder } from "./InitialStoryBuilder";
import { GraphValidator } from "./GraphValidator";

import { AdventureRepository } from "../interfaces/AdventureRepository";
import { StoryNodeRepository } from "../interfaces/StoryNodeRepository";
import { Adventure } from "../models/Adventure";
import { StoryNode } from "../models/StoryNode";
import { createInitialWorldState, NarrativeState } from "@storyforge/simulation-engine";

export class InvalidInitialGraphError extends Error {

    constructor(errors: string[]) {

        super(
            `AdventureCompiler: InitialStoryBuilder produced an invalid graph -- this is a ` +
            `programming bug in deterministic construction, not an LLM output problem:\n` +
            errors.map(error => `  - ${error}`).join("\n")
        );

    }

}

export interface CompiledAdventure {

    adventure: Adventure;

    rootNode: StoryNode;

    // Phase 2A: the seeded story state, derived by InitialStoryBuilder
    // from adventure metadata -- AdventureRuntime.startAdventure()
    // persists this onto the real WorldState.
    narrativeState: NarrativeState;

}

export interface CompileInput extends GenerateMetadataInput {

    location: string;

}

// Correction pass: the single entry point for turning a parent's
// request into a persisted, playable Story Graph -- now a THREE-step
// pipeline instead of one large LLM call:
//
//   1. AdventureMetadataGenerator -- one small LLM call, creative
//      adventure-level content only (title/characters/world/genome/
//      premise). No topology.
//   2. InitialStoryBuilder -- deterministic, zero LLM calls. Builds
//      the minimum valid graph frontier (root + up to 4 nodes).
//   3. GraphValidator -- still runs, unchanged, as a safety net
//      against bugs in step 2's construction (not LLM topology
//      mistakes, since there are none to catch anymore).
//
// Root's own narration is intentionally NOT rendered here --
// AdventureRuntime.startAdventure() calls
// NarrationRenderingService.ensureRendered() on the returned
// rootNode next, the same call playTurn() makes for every other
// node.
export class AdventureCompiler {

    private readonly validator = new GraphValidator();

    constructor(
        private readonly metadataGenerator: AdventureMetadataGenerator,
        private readonly initialStoryBuilder: InitialStoryBuilder,
        private readonly adventures: AdventureRepository,
        private readonly nodes: StoryNodeRepository
    ) {}

    async compile(
        input: CompileInput,
        options?: GenerateMetadataOptions
    ): Promise<CompiledAdventure> {

        const metadata = await this.metadataGenerator.generate(input, options);

        const adventureId = crypto.randomUUID();

        const createdAt = new Date().toISOString();

        const adventure: Adventure = {

            id: adventureId,

            childId: input.childId,

            rootNodeId: "root",

            createdAt,

            ...metadata

        };

        // A fresh WorldState purely for constraint-checking during
        // structure-building -- the REAL WorldState (with its own
        // worldId/childId) is created separately by
        // AdventureRuntime.startAdventure(). This one exists only so
        // InitialStoryBuilder -> DeterministicExpansionService has
        // something to check flags/inventory/relationships against,
        // which for a brand new adventure are all empty/default.
        const scaffoldWorldState = createInitialWorldState({

            worldId: `scaffold-${adventureId}`,

            childId: input.childId,

            location: input.location,

            moral: input.moral,

            domain: input.domain

        });

        const { rootNode, nodes, narrativeState } = await this.initialStoryBuilder.build({

            adventureId,

            worldState: scaffoldWorldState,

            characters: adventure.characters,

            actorName: input.childName,

            ageRange: input.ageRange,

            aboutChild: input.aboutChild,

            domain: input.domain,

            skillFocus: adventure.learningPlan.map(entry => entry.skillFocus),

            location: input.location,

            premise: adventure.premise,

            initialProblem: adventure.initialProblem,

            plotOutline: adventure.plotOutline

        });

        const allNodes = [rootNode, ...nodes];

        const structural = this.validator.validate(allNodes, adventure.rootNodeId);

        if (!structural.valid) {

            throw new InvalidInitialGraphError(structural.errors);

        }

        await this.adventures.save(adventure);

        await this.nodes.saveMany(allNodes);

        return { adventure, rootNode, narrativeState };

    }

}
