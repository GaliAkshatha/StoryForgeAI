import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// A self-contained, hardcoded mini-story -- no backend call, no auth.
// This exists specifically so a visitor can FEEL the actual product
// (a real choice with a real, sometimes-delayed consequence) before
// creating an account, rather than reading a static screenshot.
// Deliberately showcases the "actions matter later, not just
// instantly" mechanism the real engine now has (the callback-
// consequence work): choosing to lie doesn't fail immediately -- it
// resolves two steps later, when a witness mentions what they saw.

const PATH_ICONS = ["🗝️", "🌿", "🧭"];

interface DemoNode {
    tone: string;
    text: string;
    choices?: { label: string; next: string }[];
    isEnding?: boolean;
}

const DEMO_STORY: Record<string, DemoNode> = {

    start: {
        tone: "Calm",
        text: "\"I promised my grandmother I'd deliver these berries,\" the squirrel whispers. \"But I accidentally dropped half of them.\"",
        choices: [
            { label: "Help search for the missing berries.", next: "helped" },
            { label: "Suggest telling Grandma the truth.", next: "honest" },
            { label: "Tell Grandma the berries were stolen.", next: "lied" }
        ]
    },

    helped: {
        tone: "Pride",
        text: "You search together and find most of the berries caught in the roots of an old tree. The squirrel's whiskers relax. \"Thank you for staying with me,\" she says.",
        choices: [{ label: "Continue reading →", next: "ending_helped" }]
    },

    honest: {
        tone: "Courage",
        text: "The squirrel takes a breath. \"You're right. Grandma would rather know.\" Grandma listens, and though she sighs, she smiles. \"Thank you for telling me. We'll pick more together.\"",
        choices: [{ label: "Continue reading →", next: "ending_honest" }]
    },

    lied: {
        tone: "Uneasy",
        text: "The squirrel tells Grandma someone stole the berries. Grandma frowns but lets it go. You both walk on, the story already forgotten... or so it seems.",
        choices: [{ label: "Continue reading →", next: "ending_lied" }]
    },

    ending_helped: {
        tone: "Warm",
        text: "Grandma turns the found berries into pie for everyone in the burrow. Because you helped search instead of walking away, the squirrel learned she didn't have to face a mistake alone.",
        isEnding: true
    },

    ending_honest: {
        tone: "Trust",
        text: "That evening, Grandma asks the squirrel to help pick the next batch together. Because the truth was told early, nothing had to be carried alone or found out later.",
        isEnding: true
    },

    ending_lied: {
        tone: "Consequence",
        text: "Because the squirrel said the berries were stolen, a firefly who saw the whole thing mentions it to Grandma the next morning. Grandma isn't angry -- just quiet. \"I wish you'd just told me,\" she says. Nothing terrible happens. But something between them feels a little further apart.",
        isEnding: true
    }

};

export function LandingDemo() {

    const navigate = useNavigate();

    const [nodeId, setNodeId] = useState("start");

    const [selected, setSelected] = useState<string | null>(null);

    const node = DEMO_STORY[nodeId];

    function choose(next: string, label: string) {

        setSelected(label);

        setTimeout(() => {
            setNodeId(next);
            setSelected(null);
        }, 450);

    }

    function replay() {

        setNodeId("start");

        setSelected(null);

    }

    return (
        <div className="manuscript-frame rounded-lg bg-twilight/95 shadow-page px-7 py-8">

            <div className="flex items-center justify-between mb-4">

                <p className="font-data text-mystic text-xs tracking-[0.2em] uppercase">
                    Try it yourself
                </p>

                {node.isEnding && (
                    <button
                        onClick={replay}
                        className="text-parchmentDim/60 hover:text-ember text-xs font-body underline decoration-dotted"
                    >
                        ↺ Play again
                    </button>
                )}

            </div>

            <AnimatePresence mode="wait">

                <motion.div
                    key={nodeId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >

                    <p className="text-xs uppercase tracking-widest text-ember mb-2">
                        {node.tone}
                    </p>

                    <p className="font-narrative text-parchment text-lg leading-loose mb-6">
                        {node.text}
                    </p>

                    {node.choices && (

                        <div className="grid gap-2">

                            {node.choices.map((choice, index) => {

                                const isSelected = selected === choice.label;

                                const isDimmed = selected !== null && !isSelected;

                                return (
                                    <motion.button
                                        key={choice.label}
                                        onClick={() => choose(choice.next, choice.label)}
                                        disabled={selected !== null}
                                        animate={{ opacity: isDimmed ? 0.35 : 1 }}
                                        whileHover={!selected ? { x: 3 } : undefined}
                                        className={`text-left px-4 py-3 rounded-lg border font-body text-sm flex gap-2
                                            ${isSelected
                                                ? "border-ember bg-ember/15 text-parchment"
                                                : "border-parchmentDim/25 text-parchmentDim"}
                                            disabled:pointer-events-none transition-colors`
                                        }
                                    >
                                        <span aria-hidden="true">{PATH_ICONS[index % PATH_ICONS.length]}</span>
                                        {choice.label}
                                    </motion.button>
                                );

                            })}

                        </div>

                    )}

                    {node.isEnding && (
                        <div className="mt-2">
                            <p className="text-parchmentDim/60 font-body text-xs italic mb-2">
                                This is a two-step taste of it -- real adventures run much longer, with a story
                                generated fresh around whatever skill and theme you pick.
                            </p>
                            <button
                                onClick={() => navigate("/demo")}
                                className="text-ember text-xs font-body underline decoration-dotted hover:text-ember/80"
                            >
                                Play a full real adventure →
                            </button>
                        </div>
                    )}

                </motion.div>

            </AnimatePresence>

        </div>
    );

}
