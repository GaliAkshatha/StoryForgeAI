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

            if (!node.isEnding && node.choices.length === 0) {

                errors.push(
                    `Node '${node.id}' is not an ending but has no choices -- dead end.`
                );

            }

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
