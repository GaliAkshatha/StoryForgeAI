import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api, Choice, Reflection } from "../api/client";
import { ParchmentCard } from "../components/ParchmentCard";
import { RuneButton } from "../components/RuneButton";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";
import { LoadingJourney } from "../components/LoadingJourney";
import { ErrorNotice } from "../components/ErrorNotice";
import { NarrationControls } from "../components/NarrationControls";

const SKILLS = [
    { key: "honesty", label: "Honesty" },
    { key: "empathy", label: "Empathy" },
    { key: "courage", label: "Courage" },
    { key: "sharing", label: "Sharing" }
];

const LOCATIONS = [
    "the Whispering Wood", "a quiet space station", "a pirate cove", "a dragon's mountain trail"
];

type Stage = "setup" | "loading" | "playing" | "resolving" | "ended";

// The guest demo: a REAL adventure through the actual engine (same
// AdventureRuntime, same candidate/constraint/scoring pipeline, same
// Gemini narration), reachable with zero account. The only thing an
// account actually adds is persistence -- nothing here is ever
// written to app.learning or any repository (see demoRoutes.ts).
//
// Novel-immersion upgrade: accumulates full story text like a
// chapter book, choices only at real decision forks, "Turn the
// page" for narration-only beats.
export function DemoPage() {

    const navigate = useNavigate();

    const [stage, setStage] = useState<Stage>("setup");

    const [skill, setSkill] = useState(SKILLS[0].key);

    const [childName, setChildName] = useState("");

    const [location, setLocation] = useState(LOCATIONS[0]);

    const [context, setContext] = useState<{ worldId: string; sessionId: string } | null>(null);

    // Novel immersion: full accumulated chapter text
    const [storyLog, setStoryLog] = useState<string[]>([]);

    const [choices, setChoices] = useState<Choice[]>([]);

    const [reflection, setReflection] = useState<Reflection | null>(null);

    const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    const storyEndRef = useRef<HTMLDivElement>(null);

    // Smooth-scroll to newest paragraph
    useEffect(() => {

        if (storyLog.length > 0) {
            storyEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }

    }, [storyLog.length]);

    async function handleStart() {

        setError(null);

        setStage("loading");

        try {

            const result = await api.startDemo(skill, location, childName);

            setContext({ worldId: result.worldId, sessionId: result.sessionId });

            setStoryLog([result.narrative]);

            setChoices(result.choices);

            setStage(result.isEnding ? "ended" : "playing");

        }
        catch (err) {

            setError(err instanceof Error ? err.message : "Could not start the demo. Please try again.");

            setStage("setup");

        }

    }

    async function handleChoose(choice: Choice) {

        if (!context) return;

        setSelectedChoiceId(choice.id);

        setStage("resolving");

        try {

            const result = await api.playDemoTurn(context.worldId, context.sessionId, choice.id, childName);

            setStoryLog(prev => [...prev, result.narrative]);

            setChoices(result.choices);

            if (result.reflection) {
                setReflection(result.reflection);
            }

            setSelectedChoiceId(null);

            setStage(result.isEnding ? "ended" : "playing");

        }
        catch (err) {

            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");

            setSelectedChoiceId(null);

            setStage("playing");

        }

    }

    function restart() {

        setStage("setup");

        setContext(null);

        setStoryLog([]);

        setChoices([]);

        setReflection(null);

        setError(null);

    }

    const hasRealChoice = choices.length > 1;

    return (
        <div className="relative min-h-screen px-6 py-10">

            <Starfield count={14} />

            <div className="relative z-10 max-w-2xl mx-auto pb-32">

                <header className="flex items-center justify-between mb-8">

                    <div>
                        <p className="font-data text-mystic text-xs tracking-[0.3em] uppercase mb-1">
                            Guest Demo
                        </p>
                        <h1 className="font-display text-3xl text-parchment">Try a Real Adventure</h1>
                    </div>

                    <RuneButton variant="ghost" onClick={() => navigate("/")}>
                        Back home
                    </RuneButton>

                </header>

                <div className="mb-6 px-4 py-3 rounded-lg bg-mystic/10 border border-mystic/25 text-parchmentDim text-sm font-body">
                    This is the real story engine, no account needed. Nothing here is saved --
                    history, progress, and reflections only stick around once you{" "}
                    <button onClick={() => navigate("/auth?mode=register")} className="text-mystic underline decoration-dotted">
                        create a free account
                    </button>.
                </div>

                {error && <div className="mb-4"><ErrorNotice message={error} /></div>}

                {stage === "setup" && (

                    <ParchmentCard>

                        <div className="flex flex-col gap-5">

                            <div>
                                <p className="text-parchmentDim text-sm font-semibold mb-2">
                                    What's your name?
                                </p>
                                <input
                                    value={childName}
                                    onChange={event => setChildName(event.target.value)}
                                    placeholder="e.g. Maya"
                                    maxLength={40}
                                    className="w-full max-w-xs px-4 py-2 rounded-lg bg-night/60 border border-parchmentDim/25
                                        text-parchment font-body text-sm placeholder:text-parchmentDim/40 focus:border-ember outline-none"
                                />
                            </div>

                            <div>
                                <p className="text-parchmentDim text-sm font-semibold mb-2">Pick a skill</p>
                                <div className="flex flex-wrap gap-2">
                                    {SKILLS.map(s => (
                                        <button
                                            key={s.key}
                                            onClick={() => setSkill(s.key)}
                                            className={`px-4 py-2 rounded-full border text-sm font-body ${
                                                skill === s.key
                                                    ? "border-ember bg-ember/15 text-parchment"
                                                    : "border-parchmentDim/25 text-parchmentDim"
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-parchmentDim text-sm font-semibold mb-2">Pick a world</p>
                                <div className="flex flex-wrap gap-2">
                                    {LOCATIONS.map(loc => (
                                        <button
                                            key={loc}
                                            onClick={() => setLocation(loc)}
                                            className={`px-4 py-2 rounded-full border text-sm font-body ${
                                                location === loc
                                                    ? "border-mystic bg-mystic/15 text-parchment"
                                                    : "border-parchmentDim/25 text-parchmentDim"
                                            }`}
                                        >
                                            {loc}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <RuneButton
                                onClick={handleStart}
                                disabled={childName.trim().length === 0}
                                className="self-start"
                            >
                                Begin the story
                            </RuneButton>

                            {childName.trim().length === 0 && (
                                <p className="text-parchmentDim/50 text-xs font-body -mt-3">
                                    Enter your name above to begin — you'll be the hero of the story.
                                </p>
                            )}

                        </div>

                    </ParchmentCard>

                )}

                {stage === "loading" && (
                    <LoadingJourney
                        messages={[
                            "Dreaming up a story just for you...",
                            "Building a magical world...",
                            "Meeting new friends...",
                            "Almost ready..."
                        ]}
                    />
                )}

                {(stage === "playing" || stage === "resolving") && (
                    <div className="flex flex-col gap-6">

                        {/* ─── Chapter header ─── */}
                        <p className="text-xs uppercase tracking-[0.25em] text-mystic/60 text-center font-display select-none">
                            Chapter One
                        </p>

                        {/* ─── Flowing story text — all paragraphs ─── */}
                        <ParchmentCard className="relative overflow-hidden">

                            <div className="absolute inset-0 bg-gradient-to-br from-ember/5 to-mystic/5 pointer-events-none" />

                            <div
                                className="relative space-y-5"
                                role="article"
                                aria-label="Story chapter"
                            >
                                {storyLog.map((paragraph, index) => {

                                    const isLatest = index === storyLog.length - 1;

                                    return (
                                        <motion.p
                                            key={`p-${index}`}
                                            initial={isLatest ? { opacity: 0, y: 12 } : false}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className={`font-narrative text-lg leading-loose tracking-wide ${
                                                isLatest
                                                    ? "text-parchment"
                                                    : "text-parchment/75"
                                            }`}
                                            style={{ maxWidth: "65ch" }}
                                        >
                                            {paragraph}
                                        </motion.p>
                                    );

                                })}

                                <div ref={storyEndRef} />

                            </div>

                            <NarrationControls text={storyLog[storyLog.length - 1] ?? ""} />

                        </ParchmentCard>

                        {/* ─── Decision fork OR page turn ─── */}
                        {hasRealChoice ? (

                            /* Real decision point — choice cards */
                            <div className="flex flex-col gap-3">

                                <p className="text-xs uppercase tracking-widest text-ember/70 text-center font-display select-none">
                                    What will you do?
                                </p>

                                <div
                                    className="grid sm:grid-cols-2 gap-3"
                                    role="group"
                                    aria-label="Choose your path"
                                >
                                    {choices.map((choice, index) => {

                                        const isSelected = selectedChoiceId === choice.id;

                                        const isDimmed = selectedChoiceId !== null && !isSelected;

                                        return (
                                            <motion.button
                                                key={choice.id}
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{
                                                    opacity: isDimmed ? 0.35 : 1,
                                                    y: 0,
                                                    scale: isSelected ? 1.02 : 1
                                                }}
                                                transition={{
                                                    delay: selectedChoiceId ? 0 : index * 0.08,
                                                    duration: 0.35,
                                                    ease: "easeOut"
                                                }}
                                                whileHover={!selectedChoiceId ? { y: -3, borderColor: "rgba(78, 217, 197, 0.8)" } : undefined}
                                                whileTap={!selectedChoiceId ? { scale: 0.98 } : undefined}
                                                onClick={() => handleChoose(choice)}
                                                disabled={stage === "resolving"}
                                                className={`text-left px-5 py-5 rounded-xl border-2 font-body text-base leading-relaxed
                                                    ${isSelected
                                                        ? "border-ember bg-ember/20 text-parchment shadow-glow"
                                                        : "border-parchmentDim/25 text-parchment"}
                                                    disabled:pointer-events-none`
                                                }
                                            >
                                                {choice.text}
                                                {isSelected && stage === "resolving" && (
                                                    <motion.span
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="ml-2 inline-block"
                                                        aria-hidden="true"
                                                    >
                                                        ✓
                                                    </motion.span>
                                                )}
                                            </motion.button>
                                        );

                                    })}
                                </div>

                            </div>

                        ) : choices.length === 1 ? (

                            /* Narration continuation — soft page-turn link */
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.35 }}
                                className="flex justify-center pt-2"
                            >
                                <motion.button
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleChoose(choices[0])}
                                    disabled={stage === "resolving"}
                                    className="px-8 py-3 rounded-full border border-parchmentDim/20 text-parchment/80 font-body text-sm
                                        hover:border-mystic/40 hover:text-parchment hover:bg-mystic/5 transition-colors duration-150
                                        disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    Turn the page →
                                </motion.button>
                            </motion.div>

                        ) : null}

                        {stage === "resolving" && (
                            <p role="status" className="text-center text-sm text-parchmentDim animate-pulseGlow">
                                The story is unfolding...
                            </p>
                        )}

                    </div>
                )}

                {stage === "ended" && (

                    <div className="flex flex-col gap-6 animate-popIn">

                        {/* ─── Full chapter text ─── */}
                        <ParchmentCard className="border-ember/40 relative overflow-hidden">

                            <div className="absolute inset-0 bg-gradient-to-br from-ember/5 to-mystic/5 pointer-events-none" />

                            <p className="text-xs uppercase tracking-[0.25em] text-mystic/60 text-center font-display select-none mb-4 relative">
                                Chapter One
                            </p>

                            <div className="relative space-y-5">
                                {storyLog.map((paragraph, index) => (
                                    <p
                                        key={`end-p-${index}`}
                                        className="font-narrative text-parchment text-lg leading-loose tracking-wide"
                                        style={{ maxWidth: "65ch" }}
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                            </div>

                            <p className="font-display text-ember text-sm mt-6 text-center relative">
                                &mdash; The End &mdash;
                            </p>

                            {reflection && (
                                <div className="mt-6 pt-4 border-t border-parchmentDim/20 relative">
                                    <p className="text-mystic text-sm font-semibold mb-1">{reflection.question}</p>
                                    <p className="text-parchmentDim text-sm">{reflection.encouragement}</p>
                                </div>
                            )}

                            <NarrationControls text={storyLog.join("\n\n")} />

                        </ParchmentCard>

                        <div className="flex flex-wrap gap-3 justify-center">

                            <RuneButton onClick={restart}>Try another story</RuneButton>

                            <RuneButton variant="secondary" onClick={() => navigate("/auth?mode=register")}>
                                Save progress — create a free account
                            </RuneButton>

                        </div>

                    </div>

                )}

            </div>

            <GuideCharacter guideKey="landing" />

        </div>
    );

}
