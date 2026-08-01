import { StoryNode } from "../models/StoryNode";

export interface GraphValidationResult {

    valid: boolean;

    errors: string[];

}

// Runs immediately after generation, before anything is persisted.
// Gameplay depends entirely on graph traversal with no AI fallback
// mid-turn (that's the whole point of Part 1), so a dangling edge or
// unreachable node discovered mid-adventure would be a dead end with
// no recovery. Catching that here, once, is far cheaper than
// catching it during play.
export class GraphValidator {

    validate(
        nodes: StoryNode[],
        rootNodeId: string
    ): GraphValidationResult {

        const errors: string[] = [];

        const nodeIds = new Set(nodes.map(node => node.id));

        if (nodeIds.size !== nodes.length) {

            errors.push("Duplicate node ids in generated graph.");

        }

        if (!nodeIds.has(rootNodeId)) {

            errors.push(
                `rootNodeId '${rootNodeId}' does not match any generated node.`
            );

        }

        for (const node of nodes) {

            if (node.isEnding && node.choices.length > 0) {

                errors.push(
                    `Node '${node.id}' is marked isEnding but has ${node.choices.length} choices.`
                );

            }

            // Section D: a non-ending node with zero choices is now a
            // legitimate FRONTIER node -- "not expanded yet," not "dead
            // end." Three valid shapes exist for a StoryNode:
            //   1. isEnding=true,  choices=[]   -- genuine ending
            //   2. isEnding=false, choices=[]   -- expandable frontier
            //   3. isEnding=false, choices>0    -- already-expanded, playable
            // Only shape (1) with choices>0 is ever invalid (checked
            // above). AdventureRuntime.maybeExpandGraph() is what
            // converts shape 2 into shape 2 (deeper frontier) or shape
            // 1 (genuine ending) the moment a frontier is actually
            // reached -- GraphValidator runs at construction time,
            // when freshly-built frontier nodes are EXPECTED to be in
            // shape 2, not a bug to catch.

            for (const choice of node.choices) {

                if (!nodeIds.has(choice.nextNodeId)) {

                    errors.push(
                        `Node '${node.id}' choice '${choice.id}' points to unknown node '${choice.nextNodeId}'.`
                    );

                }

            }

        }

        if (nodeIds.has(rootNodeId)) {

            const unreachable = this.findUnreachableNodes(nodes, rootNodeId);

            for (const nodeId of unreachable) {

                errors.push(
                    `Node '${nodeId}' is unreachable from the root node.`
                );

            }

        }

        return {

            valid: errors.length === 0,

            errors

        };

    }

    private findUnreachableNodes(
        nodes: StoryNode[],
        rootNodeId: string
    ): string[] {

        const byId = new Map(nodes.map(node => [node.id, node]));

        const visited = new Set<string>();

        const queue = [rootNodeId];

        while (queue.length > 0) {

            const currentId = queue.shift()!;

            if (visited.has(currentId)) {
                continue;
            }

            visited.add(currentId);

            const current = byId.get(currentId);

            if (!current) {
                continue;
            }

            for (const choice of current.choices) {

                if (!visited.has(choice.nextNodeId)) {
                    queue.push(choice.nextNodeId);
                }

            }

        }

        return nodes

            .map(node => node.id)

            .filter(id => !visited.has(id));

    }

}
