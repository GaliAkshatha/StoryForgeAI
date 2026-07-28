import { FormEvent, useEffect, useRef, useState } from "react";
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

                            {error && <p className="text-rose text-sm" role="alert">{error}</p>}

                            <RuneButton type="submit">Begin the story</RuneButton>

                        </form>
                    </ParchmentCard>
                )}

                {stage === "opening-loading" && (
                    <LoadingCard label={`Ember is dreaming up ${child?.name ?? "the"}'s story...`} />
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
                    <div className="flex flex-col gap-6 animate-popIn">

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

                        <div
                            className="grid sm:grid-cols-2 gap-3"
                            role="group"
                            aria-label="What happens next?"
                        >
                            {choices.map((choice, index) => (
                                <button
                                    key={choice.id}
                                    onClick={() => handleChoose(choice)}
                                    disabled={stage === "resolving"}
                                    className={`text-left px-5 py-5 rounded-xl border-2 font-body text-base leading-relaxed transition-all duration-150 animate-popIn
                                        ${selectedChoiceId === choice.id
                                            ? "border-ember bg-ember/20 text-parchment animate-pulseGlow"
                                            : "border-parchmentDim/25 text-parchment hover:border-mystic hover:bg-mystic/10 hover:-translate-y-0.5"}
                                        disabled:opacity-40 disabled:pointer-events-none`
                                    }
                                    style={{ animationDelay: `${index * 60}ms` }}
                                >
                                    <span className="text-ember font-data text-xs mr-2">{index + 1}</span>
                                    {choice.text}
                                </button>
                            ))}
                        </div>

                        {stage === "resolving" && (
                            <p role="status" className="text-center text-sm text-parchmentDim animate-pulseGlow">
                                The story is unfolding...
                            </p>
                        )}

                        {error && <p className="text-rose text-sm text-center" role="alert">{error}</p>}

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

function LoadingCard({ label }: { label: string }) {

    return (
        <ParchmentCard>
            <div role="status" className="flex flex-col items-center gap-4 py-6">
                <div className="w-10 h-10 rounded-full border-2 border-ember/30 border-t-ember animate-spin" />
                <p className="text-parchmentDim text-sm animate-pulseGlow">{label}</p>
            </div>
        </ParchmentCard>
    );

}
