import {
    AdventureBlueprintGenerator,
    GenerateBlueprintInput,
    GenerateBlueprintOptions
} from "./AdventureBlueprintGenerator";

import { AdventureRepository } from "../interfaces/AdventureRepository";
import { StoryNodeRepository } from "../interfaces/StoryNodeRepository";
import { Adventure } from "../models/Adventure";
import { StoryNode } from "../models/StoryNode";

export class RootNodeMissingError extends Error {

    constructor(rootNodeId: string) {

        super(`Generated blueprint's rootNodeId '${rootNodeId}' was not found among its own nodes.`);

    }

}

export interface CompiledAdventure {

    adventure: Adventure;

    rootNode: StoryNode;

}

// Phase 4's "AdventureCompiler": the single entry point for turning a
// parent's request into a persisted, playable Story Graph. Wraps
// AdventureBlueprintGenerator.generate() (the one expensive AI call,
// which already runs GraphValidator internally) with persistence, so
// AdventureRuntime.startAdventure has one call to make instead of
// orchestrating generate + save + save-many + root-lookup itself.
export class AdventureCompiler {

    constructor(
        private readonly generator: AdventureBlueprintGenerator,
        private readonly adventures: AdventureRepository,
        private readonly nodes: StoryNodeRepository
    ) {}

    async compile(
        input: GenerateBlueprintInput,
        options?: GenerateBlueprintOptions
    ): Promise<CompiledAdventure> {

        const blueprint = await this.generator.generate(input, options);

        await this.adventures.save(blueprint.adventure);

        await this.nodes.saveMany(blueprint.nodes);

        const rootNode = blueprint.nodes.find(
            node => node.id === blueprint.adventure.rootNodeId
        );

        if (!rootNode) {

            throw new RootNodeMissingError(blueprint.adventure.rootNodeId);

        }

        return { adventure: blueprint.adventure, rootNode };

    }

}
