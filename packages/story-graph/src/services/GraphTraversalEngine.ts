import { StoryNode } from "../models/StoryNode";
import { StoryChoice } from "../models/StoryChoice";
import { StoryNodeRepository } from "../interfaces/StoryNodeRepository";

export class UnknownChoiceError extends Error {

    constructor(choiceId: string) {

        super(`'${choiceId}' is not one of the choices currently offered.`);

    }

}

export class UnknownNodeError extends Error {

    constructor(nodeId: string) {

        super(`Story node '${nodeId}' does not exist.`);

    }

}

// The literal "Current Node -> Child Choice -> Edge Traversal ->
// Next Node" step, factored out of AdventureRuntime so it has its
// own name, its own tests, and no dependency on anything
// turn-orchestration-related (Reflection, Analytics, WorldState). It
// only ever reads -- AdventureRuntime remains the only place that
// writes WorldState.
export class GraphTraversalEngine {

    constructor(
        private readonly nodes: StoryNodeRepository
    ) {}

    resolveChoice(
        currentNode: StoryNode,
        choiceId: string
    ): StoryChoice {

        const choice = currentNode.choices.find(candidate => candidate.id === choiceId);

        if (!choice) {

            throw new UnknownChoiceError(choiceId);

        }

        return choice;

    }

    async traverse(
        adventureId: string,
        currentNode: StoryNode,
        choiceId: string
    ): Promise<{ choice: StoryChoice; nextNode: StoryNode }> {

        const choice = this.resolveChoice(currentNode, choiceId);

        const nextNode = await this.nodes.findById(adventureId, choice.nextNodeId);

        if (!nextNode) {

            throw new UnknownNodeError(choice.nextNodeId);

        }

        return { choice, nextNode };

    }

}
