import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "../state/SessionContext";
import { api } from "../api/client";
import { RuneButton } from "../components/RuneButton";
import { ParchmentCard } from "../components/ParchmentCard";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";

// New onboarding step (Part: API Key Flow). Shown once, right after
// registration -- ParentAuthPage now routes here instead of straight
// to /dashboard. Calls the already-existing, already-tested
// /settings/api-key routes; nothing about the backend changes here.
export function ApiKeySetupPage() {

    const { token } = useSession();

    const navigate = useNavigate();

    const [apiKey, setApiKey] = useState("");

    const [showKey, setShowKey] = useState(false);

    const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

    const [error, setError] = useState<string | null>(null);

    async function handleSave() {

        if (!token || apiKey.trim().length < 10) {

            setError("That doesn't look like a complete API key yet.");

            return;

        }

        setError(null);

        setStatus("saving");

        try {

            await api.setApiKey(token, apiKey.trim());

            setStatus("success");

            // A short beat to let the success animation actually be
            // seen before moving on -- an instant redirect would
            // undercut the moment "Success states" asked for.
            setTimeout(() => navigate("/dashboard"), 1100);

        }
        catch (err) {

            setStatus("error");

            setError(err instanceof Error ? err.message : "Could not save that key. Please check it and try again.");

        }

    }

    return (
        <div className="relative min-h-screen flex items-center justify-center px-6 py-16">

            <Starfield />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-lg"
            >

                <ParchmentCard className="text-left">

                    <p className="font-data text-mystic text-xs tracking-[0.2em] uppercase mb-3">
                        One last thing
                    </p>

                    <h1 className="font-display text-2xl text-parchment mb-4">
                        Connect your Gemini API key
                    </h1>

                    <p className="text-parchmentDim font-body text-sm leading-relaxed mb-6">
                        StoryForge uses your own Gemini API key to write every adventure.
                        It stays private, encrypted, and is only ever used to generate
                        your child's stories, never shared or shown again once saved.
                    </p>

                    <AnimatePresence mode="wait">

                        {status === "success" ? (

                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="flex flex-col items-center gap-3 py-6 text-center"
                            >

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                                    className="w-14 h-14 rounded-full bg-mystic/20 border-2 border-mystic flex items-center justify-center text-2xl"
                                    aria-hidden="true"
                                >
                                    ✓
                                </motion.div>

                                <p className="font-display text-lg text-mystic">
                                    Key connected
                                </p>

                                <p className="text-parchmentDim text-sm font-body">
                                    Taking you to your dashboard…
                                </p>

                            </motion.div>

                        ) : (

                            <motion.div key="form" exit={{ opacity: 0 }}>

                                <label htmlFor="gemini-api-key" className="block font-body text-sm text-parchmentDim mb-2">
                                    Gemini API key
                                </label>

                                <div className="relative mb-2">

                                    <input
                                        id="gemini-api-key"
                                        type={showKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={event => setApiKey(event.target.value)}
                                        placeholder="AIza..."
                                        autoComplete="off"
                                        disabled={status === "saving"}
                                        className="w-full px-4 py-3 pr-12 rounded-lg bg-night/60 border border-parchmentDim/25 text-parchment
                                            font-data text-sm placeholder:text-parchmentDim/40 focus:border-mystic outline-none
                                            disabled:opacity-60"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowKey(show => !show)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-parchmentDim/60 hover:text-parchment text-xs font-body"
                                        aria-label={showKey ? "Hide API key" : "Show API key"}
                                    >
                                        {showKey ? "Hide" : "Show"}
                                    </button>

                                </div>

                                <AnimatePresence>

                                    {error && (

                                        <motion.p
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="text-rose text-xs font-body mb-3"
                                            role="alert"
                                        >
                                            {error}
                                        </motion.p>

                                    )}

                                </AnimatePresence>

                                <div className="flex items-center gap-3 mt-5">

                                    <RuneButton onClick={handleSave} disabled={status === "saving"}>
                                        {status === "saving" ? "Checking your key…" : "Save and continue"}
                                    </RuneButton>

                                    <RuneButton variant="ghost" onClick={() => navigate("/dashboard")}>
                                        I'll add this later
                                    </RuneButton>

                                </div>

                                <p className="text-parchmentDim/50 text-xs font-body mt-6">
                                    Don't have a key yet? Get a free one from{" "}
                                    <a
                                        href="https://aistudio.google.com/apikey"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-mystic underline decoration-dotted"
                                    >
                                        Google AI Studio
                                    </a>.
                                </p>

                            </motion.div>

                        )}

                    </AnimatePresence>

                </ParchmentCard>

            </motion.div>

            <GuideCharacter guideKey="landing" position="corner" />

        </div>
    );

}
