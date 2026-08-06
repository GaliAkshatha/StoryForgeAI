import { FormEvent, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
    api,
    ChildProfile,
    Choice,
    LearningObjective,
    Reflection,
    LearningAnalyticsResult
} from "../api/client";
import { useSession } from "../state/SessionContext";
import { ParchmentCard } from "../components/ParchmentCard";
import { RuneButton } from "../components/RuneButton";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";
import { NarrationControls } from "../components/NarrationControls";
import { LoadingJourney } from "../components/LoadingJourney";
import { ErrorNotice } from "../components/ErrorNotice";

// Deterministic by position, not by parsing choice text -- keyword-
// matching a phrase to "the right" icon is fragile NLP; a small,
// consistent set that always differs across simultaneous choices is
// enough to make each option feel like a distinct path, not a plain
// list item.
const PATH_ICONS = ["🗝️", "🌿", "🧭", "✨"];

type Stage =
    | "setup"
    | "opening-loading"
    | "objective-reveal"
    | "playing"
    | "resolving"
    | "ended";

interface AdventureContext {
    worldId: string;
    sessionId: string;
}

export function AdventurePage() {

    const { childId } = useParams<{ childId: string }>();

    const { token } = useSession();

    const navigate = useNavigate();

    const [child, setChild] = useState<ChildProfile | null>(null);

    const [stage, setStage] = useState<Stage>("setup");

    const [location, setLocation] = useState("the edge of the Whispering Wood");

    const [learningGoal, setLearningGoal] = useState("");

    const [context, setContext] = useState<AdventureContext | null>(null);

    const [objective, setObjective] = useState<LearningObjective | null>(null);

    const [narrative, setNarrative] = useState("");

    const [emotionalTone, setEmotionalTone] = useState("");

    const [choices, setChoices] = useState<Choice[]>([]);

    const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

    const [reflection, setReflection] = useState<Reflection | null>(null);

    const [analytics, setAnalytics] = useState<LearningAnalyticsResult | null>(null);

    const [error, setError] = useState<string | null>(null);

    const narrativeHeadingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {

        if (!token || !childId) return;

        api.listChildren(token).then(result => {

            setChild(result.children.find(c => c.id === childId) ?? null);

        });

    }, [token, childId]);

    // Move focus to the new narrative whenever it changes, so screen
    // reader users and keyboard users land on the new content instead
    // of a stale focus target.
    useEffect(() => {

        if (stage === "playing" || stage === "ended") {

            narrativeHeadingRef.current?.focus();

        }

    }, [stage, narrative]);

    async function handleStart(event: FormEvent) {

        event.preventDefault();

        if (!token || !childId || !learningGoal.trim()) return;

        setError(null);

        setStage("opening-loading");

        try {

            const result = await api.startAdventure(token, {
                childId,
                location,
                learningGoal: learningGoal.trim()
            });

            setContext({ worldId: result.worldId, sessionId: result.sessionId });

            setObjective(result.objective);

            setNarrative(result.narrative);

            setEmotionalTone(result.emotionalTone);

            setChoices(result.choices);

            setStage("objective-reveal");

        }
        catch (err) {

            setError(err instanceof Error ? err.message : "Could not start the adventure.");

            setStage("setup");

        }

    }

    async function handleChoose(choice: Choice) {

        if (!token || !childId || !context) return;

        setError(null);

        setSelectedChoiceId(choice.id);

        setStage("resolving");

        try {

            const result = await api.playTurn(token, {
                worldId: context.worldId,
                sessionId: context.sessionId,
                childId,
                selectedChoiceId: choice.id
            });

            setNarrative(result.narrative);

            setEmotionalTone(result.emotionalTone);

            setChoices(result.choices);

            // v3: reflection/analytics only arrive when this turn
            // concluded a chapter -- most turns leave them null, and
            // the story simply continues (isEnding stays false).
            setReflection(result.reflection ?? null);

            setAnalytics(result.analytics ?? null);

            setStage(result.isEnding ? "ended" : "playing");

        }
        catch (err) {

            setError(err instanceof Error ? err.message : "The story couldn't continue. Try again.");

            setStage("playing");

        }
        finally {

            setSelectedChoiceId(null);

        }

    }

    function handlePlayAgain() {

        setStage("setup");

        setContext(null);

        setObjective(null);

        setNarrative("");

        setChoices([]);

        setReflection(null);

        setAnalytics(null);

        setLearningGoal("");

    }

    return (
        <div className="relative min-h-screen px-6 py-10">

            <Starfield count={20} />

            <div className="relative z-10 max-w-2xl mx-auto pb-32">

                <button
                    onClick={() => navigate("/dashboard")}
                    className="text-parchmentDim text-sm mb-6 hover:text-ember"
                >
                    ← Back to the Study
                </button>

                <h1 className="font-display text-2xl text-parchment mb-8 text-center">
                    {child ? `${child.name}'s Storybook` : "The Storybook"}
                </h1>

                {stage === "setup" && (
                    <ParchmentCard>
                        <h2 className="font-display text-lg text-ember mb-4">Open a new chapter</h2>
                        <form onSubmit={handleStart} className="flex flex-col gap-4">

                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-parchmentDim font-semibold">Where does it begin?</span>
                                <input
                                    value={location}
                                    onChange={event => setLocation(event.target.value)}
                                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment focus:border-ember outline-none"
                                    required
                                />
                            </label>

                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-parchmentDim font-semibold">
                                    What would you like {child?.name ?? "your child"} to work on?
                                </span>
                                <span className="text-xs text-parchmentDim/70">
                                    Write it in your own words -- Ember will turn it into a story, never a lecture.
                                </span>
                                <textarea
                                    value={learningGoal}
                                    onChange={event => setLearningGoal(event.target.value)}
                                    placeholder="e.g. My son struggles with losing. Or: I want her to understand honesty."
                                    rows={3}
                                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment placeholder:text-parchmentDim/40 focus:border-ember outline-none resize-none"
                                    required
                                />
                            </label>

                            {error && <ErrorNotice message={error} />}

                            <RuneButton type="submit">Begin the story</RuneButton>

                        </form>
                    </ParchmentCard>
                )}

                {stage === "opening-loading" && (
                    <LoadingJourney
                        messages={[
                            `Ember is dreaming up ${child?.name ?? "the"}'s story...`,
                            "Building a magical world...",
                            "Meeting new friends...",
                            "Choosing today's challenge...",
                            "Drawing the map...",
                            "Almost ready..."
                        ]}
                    />
                )}

                {stage === "objective-reveal" && objective && (
                    <ParchmentCard className="animate-popIn text-center">
                        <p className="text-xs uppercase tracking-widest text-mystic mb-3">
                            Ember has an idea
                        </p>
                        <p className="text-parchment mb-4">{objective.rationale}</p>
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {objective.skillFocus.map(skill => (
                                <span
                                    key={skill}
                                    className="text-xs px-3 py-1 rounded-full bg-ember/15 text-ember capitalize"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                        <RuneButton onClick={() => setStage("playing")}>
                            Begin the Story
                        </RuneButton>
                        <p className="text-xs text-parchmentDim/60 mt-4">
                            Only you can see this -- {child?.name ?? "your child"} just sees the adventure.
                        </p>
                    </ParchmentCard>
                )}

                {(stage === "playing" || stage === "resolving") && (
                    <div className="flex flex-col gap-6">

                        <motion.div
                            key={narrative}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                        >

                        <ParchmentCard className="relative overflow-hidden">

                            <div className="absolute inset-0 bg-gradient-to-br from-ember/5 to-mystic/5 pointer-events-none" />

                            {emotionalTone && (
                                <p className="text-xs uppercase tracking-widest text-mystic mb-2 relative">
                                    {emotionalTone}
                                </p>
                            )}

                            <h2
                                ref={narrativeHeadingRef}
                                tabIndex={-1}
                                aria-live="polite"
                                className="font-narrative text-parchment text-lg leading-loose tracking-wide relative outline-none"
                            >
                                {narrative}
                            </h2>

                            <NarrationControls text={narrative} />

                        </ParchmentCard>

                        </motion.div>

                        {choices.length === 1 ? (

                            // Narration-only continuation -- this is
                            // NOT a decision, it's turning the page.
                            // Rendering it as a numbered quiz card
                            // identical to real choices was the
                            // actual source of the "feels like an
                            // MCQ" complaint: visually there was zero
                            // difference between "keep reading" and
                            // "make a meaningful choice."
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.35 }}
                                className="flex justify-center pt-2"
                            >
                                <motion.button
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleChoose(choices[0])}
                                    disabled={stage === "resolving"}
                                    className="px-8 py-3 rounded-full border-2 border-mystic/40 text-parchment font-body text-base
                                        hover:border-mystic hover:bg-mystic/10 transition-colors duration-150
                                        disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    Continue reading →
                                </motion.button>
                            </motion.div>

                        ) : (

                            <div
                                className="grid sm:grid-cols-2 gap-3"
                                role="group"
                                aria-label="What will you choose?"
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
                                            <span className="text-lg mr-2" aria-hidden="true">
                                                {PATH_ICONS[index % PATH_ICONS.length]}
                                            </span>
                                            <span className="text-ember font-data text-xs mr-2">{index + 1}</span>
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

                        )}

                        {stage === "resolving" && (
                            <p role="status" className="text-center text-sm text-parchmentDim animate-pulseGlow">
                                The story is unfolding...
                            </p>
                        )}

                        {error && <ErrorNotice message={error} />}

                    </div>
                )}

                {stage === "ended" && (
                    <div className="flex flex-col gap-6 animate-popIn">

                        <ParchmentCard className="border-ember/40">
                            {emotionalTone && (
                                <p className="text-xs uppercase tracking-widest text-mystic mb-2">
                                    {emotionalTone}
                                </p>
                            )}
                            <h2
                                ref={narrativeHeadingRef}
                                tabIndex={-1}
                                aria-live="polite"
                                className="font-narrative text-parchment text-lg leading-loose tracking-wide outline-none mb-2"
                            >
                                {narrative}
                            </h2>
                            <p className="font-display text-ember text-sm mt-4">&mdash; The End &mdash;</p>

                            <NarrationControls text={narrative} />
                        </ParchmentCard>

                        {reflection && (
                            <ParchmentCard>
                                <p className="text-xs uppercase tracking-widest text-ember mb-2">
                                    A moment to think
                                </p>
                                <p className="text-parchment font-semibold mb-3">{reflection.question}</p>
                                <ul className="text-sm text-parchmentDim flex flex-col gap-1 mb-4">
                                    {reflection.followUpQuestions.map((question, index) => (
                                        <li key={index}>&bull; {question}</li>
                                    ))}
                                </ul>
                                <p className="text-mystic text-sm italic">{reflection.encouragement}</p>
                            </ParchmentCard>
                        )}

                        {analytics && (
                            <ParchmentCard>
                                <p className="text-xs uppercase tracking-widest text-mystic mb-2">
                                    What Ember noticed
                                </p>
                                <p className="text-parchment text-sm">{analytics.summary}</p>
                            </ParchmentCard>
                        )}

                        <RuneButton onClick={handlePlayAgain} className="self-center">
                            Start a new chapter &rarr;
                        </RuneButton>

                    </div>
                )}

            </div>

            <GuideCharacter
                guideKey={
                    stage === "setup" ? "adventure-start" :
                    stage === "ended" ? "adventure-reflection" :
                    "adventure-situation"
                }
                override={
                    stage === "ended" && reflection
                        ? { mood: "thinking", text: reflection.question }
                        : undefined
                }
            />

        </div>
    );

}
