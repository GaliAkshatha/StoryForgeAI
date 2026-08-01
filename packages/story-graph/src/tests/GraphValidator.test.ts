import { GraphValidator } from "../services/GraphValidator";
import { StoryNode } from "../models/StoryNode";
import { neutralEmotionProfile } from "../models/EmotionProfile";

function node(
    id: string,
    choices: { id: string; nextNodeId: string }[],
    isEnding = false
): StoryNode {

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

        isEnding,

        createdAt: new Date().toISOString()

    };

}

function main(): void {

    const validator = new GraphValidator();

    // --- A valid, converging graph ---

    const validNodes: StoryNode[] = [

        node("root", [
            { id: "a", nextNodeId: "left" },
            { id: "b", nextNodeId: "right" }
        ]),

        node("left", [{ id: "c", nextNodeId: "end" }]),

        node("right", [{ id: "d", nextNodeId: "end" }]),

        node("end", [], true)

    ];

    const validResult = validator.validate(validNodes, "root");

    console.assert(
        validResult.valid,
        `Expected a valid graph, got errors: ${validResult.errors.join(", ")}`
    );

    // --- Dangling edge ---

    const danglingNodes: StoryNode[] = [

        node("root", [{ id: "a", nextNodeId: "nowhere" }])

    ];

    const danglingResult = validator.validate(danglingNodes, "root");

    console.assert(
        !danglingResult.valid &&
        danglingResult.errors.some(e => e.includes("unknown node")),
        "Expected a dangling-edge error to be reported"
    );

    // --- Unreachable node ---

    const unreachableNodes: StoryNode[] = [

        node("root", [{ id: "a", nextNodeId: "end" }]),

        node("end", [], true),

        node("orphan", [], true)

    ];

    const unreachableResult = validator.validate(unreachableNodes, "root");

    console.assert(
        !unreachableResult.valid &&
        unreachableResult.errors.some(e => e.includes("orphan") && e.includes("unreachable")),
        "Expected an unreachable-node error to be reported"
    );

    // --- Ending node with choices (invalid) ---

    const badEndingNodes: StoryNode[] = [

        node("root", [{ id: "a", nextNodeId: "end" }]),

        node("end", [{ id: "b", nextNodeId: "root" }], true)

    ];

    const badEndingResult = validator.validate(badEndingNodes, "root");

    console.assert(
        !badEndingResult.valid &&
        badEndingResult.errors.some(e => e.includes("isEnding but has")),
        "Expected an ending-node-with-choices error to be reported"
    );

    // --- Non-ending node with no choices is now a legitimate
    // FRONTIER node (Section D correction pass), NOT a dead end. This
    // replaces a stale assertion that used to require the opposite --
    // "not an ending but has no choices" used to be treated as a bug
    // signature, but that was exactly the root cause of the
    // one-turn-ending bug: every unexpanded frontier node
    // legitimately looks like this until AdventureRuntime.
    // maybeExpandGraph() reaches and expands it. ---

    const frontierNodes: StoryNode[] = [

        node("root", [])

    ];

    const frontierResult = validator.validate(frontierNodes, "root");

    console.assert(
        frontierResult.valid,
        `Expected a non-ending node with zero choices to be a VALID frontier, got errors: ${frontierResult.errors.join(", ")}`
    );

    // --- Missing root ---

    const missingRootResult = validator.validate(validNodes, "does-not-exist");

    console.assert(
        !missingRootResult.valid &&
        missingRootResult.errors.some(e => e.includes("does not match any generated node")),
        "Expected a missing-root error to be reported"
    );

    console.log("GraphValidator tests passed.");

}

main();
