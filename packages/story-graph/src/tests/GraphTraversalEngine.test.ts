import {
    GraphTraversalEngine,
    UnknownChoiceError,
    UnknownNodeError
} from "../services/GraphTraversalEngine";

import { InMemoryStoryNodeRepository } from "../state/InMemoryStoryNodeRepository";
import { StoryNode } from "../models/StoryNode";
import { neutralEmotionProfile } from "../models/EmotionProfile";

function node(id: string, choices: { id: string; nextNodeId: string }[]): StoryNode {

    return {

        id,

        adventureId: "adventure-1",

        narrative: `Narrative for ${id}`,

        choices: choices.map(c => ({ id: c.id, text: `Choice ${c.id}`, nextNodeId: c.nextNodeId })),

        learningSignals: [],

        emotion: neutralEmotionProfile(),

        effects: [],

        difficulty: 1,

        readingLevel: "beginner",

        isEnding: choices.length === 0,

        createdAt: new Date().toISOString()

    };

}

async function main(): Promise<void> {

    const repo = new InMemoryStoryNodeRepository();

    const root = node("root", [{ id: "a", nextNodeId: "leaf" }]);

    const leaf = node("leaf", []);

    await repo.saveMany([root, leaf]);

    const engine = new GraphTraversalEngine(repo);

    // --- Happy path ---

    const result = await engine.traverse("adventure-1", root, "a");

    console.assert(
        result.nextNode.id === "leaf",
        `Expected traversal to reach 'leaf', got '${result.nextNode.id}'`
    );

    console.assert(
        result.choice.id === "a",
        "Expected the resolved choice to be 'a'"
    );

    // --- Unknown choice ---

    let threwUnknownChoice = false;

    try {
        await engine.traverse("adventure-1", root, "does-not-exist");
    }
    catch (error) {
        threwUnknownChoice = error instanceof UnknownChoiceError;
    }

    console.assert(threwUnknownChoice, "Expected UnknownChoiceError for an invalid choice id");

    // --- Dangling edge (choice points at a node that doesn't exist) ---

    const dangling = node("dangling", [{ id: "x", nextNodeId: "nowhere" }]);

    await repo.saveMany([dangling]);

    let threwUnknownNode = false;

    try {
        await engine.traverse("adventure-1", dangling, "x");
    }
    catch (error) {
        threwUnknownNode = error instanceof UnknownNodeError;
    }

    console.assert(threwUnknownNode, "Expected UnknownNodeError for a dangling edge");

    console.log("GraphTraversalEngine tests passed.");

}

main();
