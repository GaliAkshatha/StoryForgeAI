import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { RuneButton } from "../components/RuneButton";
import { ParchmentCard } from "../components/ParchmentCard";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";

const CHAPTERS = [

    {
        mark: "Chapter One",
        title: "Pick a skill and a world",
        body: "Honesty, empathy, courage, sharing. Pick a theme they love: forest, space, pirates, dragons."
    },
    {
        mark: "Chapter Two",
        title: "They play, not study",
        body: "A real adventure with characters, a mystery, and choices that matter. No lesson, no quiz, no score in sight."
    },
    {
        mark: "Chapter Three",
        title: "The lesson lives in what happens",
        body: "Choices carry real consequences inside the story. A short reflection at the end names what they just lived through."
    }

];

// New section, at the user's request: an honest, non-technical
// account of the actual mechanism -- deterministic rules decide
// gameplay, the AI only narrates, and the end-of-story reflection
// comes from the same rule-based tally, not an AI opinion. This
// mirrors the real architecture (CandidateEventGenerator/
// ConstraintEngine/EventScorer decide; Gemini narrates; a
// deterministic engine scores skill signals for the reflection),
// simplified for a parent reading a landing page, not a changelog.
const BEHIND_THE_PAGE = [

    {
        mark: "I.",
        title: "Once, quietly",
        body: "When you set up an adventure, the AI reads the skill and theme you picked, just once, and builds a world: characters, a place, a problem to discover. It never says the lesson out loud."
    },
    {
        mark: "II.",
        title: "Turn by turn, by rule",
        body: "What actually happens next is decided by a set of consistent rules, not the AI improvising. An option is only ever offered if it makes sense for what's already true in the story, so characters and places stay the same from one page to the next."
    },
    {
        mark: "III.",
        title: "The AI puts it into words",
        body: "Once the rules decide what happens, the AI is asked to describe just that one moment, in a few warm, age-appropriate sentences. It narrates. It doesn't decide."
    },
    {
        mark: "IV.",
        title: "What you see afterward",
        body: "The same rule-based system looks back at exactly what your child chose and tallies which skills came up, no guessing involved. A short reflection question then turns that into something you can talk about together."
    }

];

const WHY_DIFFERENT = [
    {
        title: "Not a lecture in disguise",
        body: "Nobody in the story says \"honesty is important.\" Your child discovers it because a character trusted them, or didn't, based on what they chose."
    },
    {
        title: "Consequences, not scores",
        body: "There's no points system to game. If a choice causes a problem, the story shows it and lets your child feel it."
    },
    {
        title: "Every adventure is their own",
        body: "The world, characters, and problem are generated fresh around the skill and theme you pick, never a fixed script."
    }
];

export function LandingPage() {

    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen">

            <Starfield />

            {/* Hero: asymmetric on purpose -- the pitch sits wider and
                looser, the "page" is tucked in at an angle with an
                ornamental frame, rather than two equal boxes mirrored
                across a grid. Each section is now its own full-height
                screen, with clear separation, instead of flowing
                straight into the next. */}
            <div className="relative z-10 min-h-screen flex items-center px-6 py-20 max-w-6xl mx-auto">
              <div className="w-full">

                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-start">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="text-left lg:pt-6"
                    >

                        <p className="font-data text-mystic text-xs tracking-[0.3em] uppercase mb-4">
                            An Adaptive Learning Adventure
                        </p>

                        <h1 className="font-display text-4xl md:text-6xl text-parchment leading-tight mb-6">
                            Every Choice
                            <br />
                            <span className="text-ember">Writes the Lesson</span>
                        </h1>

                        <p className="text-parchmentDim text-lg mb-8 font-body leading-relaxed max-w-md">
                            <span
                                className="float-left font-display text-7xl text-ember leading-[0.75] mr-3 mt-1"
                                aria-hidden="true"
                            >
                                Y
                            </span>
                            our child steps into a living story. They decide what happens
                            next, and the world remembers it. You watch what they learn
                            along the way.
                        </p>

                        <div className="flex flex-wrap items-center gap-4 mb-4">

                            <RuneButton onClick={() => navigate("/auth?mode=register")}>
                                Begin the Journey
                            </RuneButton>

                            <RuneButton variant="secondary" onClick={() => navigate("/auth?mode=login")}>
                                I have an account
                            </RuneButton>

                        </div>

                        <p className="text-parchmentDim/60 text-xs font-body">
                            Free to start. Bring your own Gemini API key — no subscription required.
                        </p>

                    </motion.div>

                    {/* The "page" -- ornamental frame, angled and
                        offset rather than grid-aligned with the text
                        beside it, with a small seal mark standing in
                        for a bookmark ribbon. */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                        className="relative lg:mt-10 lg:-rotate-2 hover:rotate-0 transition-transform duration-300"
                    >

                        <div className="manuscript-frame rounded-lg bg-twilight/95 shadow-page px-7 py-8">

                            <p className="font-data text-mystic text-xs tracking-[0.2em] uppercase mb-4">
                                A page from the book
                            </p>

                            <p className="font-narrative text-parchment text-lg leading-loose mb-6">
                                "I promised my grandmother I'd deliver these berries," the
                                squirrel whispers. "But I accidentally dropped half of them."
                            </p>

                            <div className="grid gap-2">
                                {[
                                    "Help search for the missing berries.",
                                    "Suggest telling Grandma the truth.",
                                    "Tell Grandma the berries were stolen."
                                ].map((choice, index) => (
                                    <div
                                        key={choice}
                                        className="px-4 py-3 rounded-lg border border-parchmentDim/25 text-parchmentDim font-body text-sm flex gap-2"
                                    >
                                        <span className="text-ember font-data text-xs">{index + 1}</span>
                                        {choice}
                                    </div>
                                ))}
                            </div>

                            <p className="text-parchmentDim/60 font-body text-xs italic mt-5">
                                No one mentions honesty. Whatever your child picks, the story responds.
                            </p>

                        </div>

                        <div
                            className="hidden md:block absolute -top-4 -right-4 w-12 h-12 rounded-full bg-ember/90 text-night font-display text-xl flex items-center justify-center shadow-glow rotate-6"
                            aria-hidden="true"
                        >
                            &amp;
                        </div>

                    </motion.div>

                </div>

              </div>
            </div>

            {/* Chapters */}
            <section className="relative z-10 min-h-screen flex items-center border-t border-ember/20 bg-night/40 px-6 py-20">

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="max-w-5xl mx-auto w-full"
                >

                    <h2 className="font-display text-2xl md:text-3xl text-parchment text-center mb-2">
                        How the story unfolds
                    </h2>

                    <p className="text-parchmentDim text-center mb-14 font-body max-w-xl mx-auto">
                        Three minutes to set up. The story does the rest.
                    </p>

                    <div className="grid md:grid-cols-3 gap-px bg-ember/15 rounded-2xl overflow-hidden">

                        {CHAPTERS.map((chapter, index) => (

                            <motion.div
                                key={chapter.mark}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.12, duration: 0.4 }}
                                className="bg-night px-7 py-8 text-left"
                            >

                                <span className="font-data text-ember text-[11px] tracking-[0.25em] uppercase">
                                    {chapter.mark}
                                </span>

                                <h3 className="font-display text-xl text-parchment mt-3 mb-3">
                                    {chapter.title}
                                </h3>

                                <p className="text-parchmentDim font-body leading-relaxed text-sm">
                                    {chapter.body}
                                </p>

                            </motion.div>

                        ))}

                    </div>

                </motion.div>

            </section>

            {/* Behind the page -- the mechanism, explained honestly
                for a parent: what's AI, what's a fixed rule, and
                where the reflection actually comes from. */}
            <section className="relative z-10 min-h-screen flex items-center px-6 py-20 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full"
              >

                <p className="font-data text-mystic text-xs tracking-[0.3em] uppercase text-center mb-3">
                    For the curious parent
                </p>

                <h2 className="font-display text-2xl md:text-3xl text-parchment text-center mb-3">
                    Behind the page
                </h2>

                <p className="text-parchmentDim text-center mb-14 font-body max-w-xl mx-auto">
                    A plain account of what's AI and what isn't.
                </p>

                <div className="space-y-8">

                    {BEHIND_THE_PAGE.map((item, index) => (

                        <motion.div
                            key={item.mark}
                            initial={{ opacity: 0, x: -12 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.4 }}
                            className="flex gap-5 items-start"
                        >

                            <span className="font-display text-2xl text-ember/80 pt-1 w-8 shrink-0">
                                {item.mark}
                            </span>

                            <div className="border-l border-parchmentDim/20 pl-5">

                                <h3 className="font-display text-lg text-parchment mb-1">
                                    {item.title}
                                </h3>

                                <p className="text-parchmentDim font-body leading-relaxed text-sm">
                                    {item.body}
                                </p>

                            </div>

                        </motion.div>

                    ))}

                </div>

              </motion.div>
            </section>

            {/* Why different */}
            <section className="relative z-10 min-h-screen flex items-center border-t border-ember/20 px-6 py-20 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full"
              >

                <h2 className="font-display text-2xl md:text-3xl text-parchment text-center mb-12">
                    Why it's different
                </h2>

                <div className="grid md:grid-cols-3 gap-8">

                    {WHY_DIFFERENT.map((item, index) => (

                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.4 }}
                            className="text-left border-l-2 border-mystic/40 pl-5"
                        >

                            <h3 className="font-display text-lg text-mystic mb-2">
                                {item.title}
                            </h3>

                            <p className="text-parchmentDim font-body leading-relaxed text-sm">
                                {item.body}
                            </p>

                        </motion.div>

                    ))}

                </div>

              </motion.div>
            </section>

            {/* Final CTA -- includes the trust note, so the closing
                screen isn't two separate, thin full-height sections. */}
            <section className="relative z-10 min-h-screen border-t border-ember/20 px-6 py-20 flex flex-col items-center justify-center text-center">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >

                    <GuideCharacter guideKey="landing" position="center" />

                    <h2 className="font-display text-2xl md:text-3xl text-parchment mt-8 mb-6 max-w-lg">
                        Ready to start their first adventure?
                    </h2>

                    <RuneButton onClick={() => navigate("/auth?mode=register")}>
                        Begin the Journey
                    </RuneButton>

                    <p className="font-body text-parchmentDim/70 text-sm leading-relaxed max-w-md mt-10">
                        Your child's stories run on your own Gemini API key, kept encrypted and
                        never shown again once saved. Nothing is sold, and no ads run inside
                        the story.
                    </p>

                </motion.div>

            </section>

        </div>
    );

}
