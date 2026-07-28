import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserSpeechSynthesisProvider } from "../narration/BrowserSpeechSynthesisProvider";
import { TTSProvider, TTSVoiceOption } from "../narration/TTSProvider";

const provider: TTSProvider = new BrowserSpeechSynthesisProvider();

const PREFS_KEY = "storyforge_narration_prefs";

interface NarrationPrefs {

    voiceId?: string;

    rate: number;

    pitch: number;

}

function loadPrefs(): NarrationPrefs {

    try {

        const raw = localStorage.getItem(PREFS_KEY);

        return raw ? JSON.parse(raw) : { rate: 1, pitch: 1 };

    }
    catch {

        return { rate: 1, pitch: 1 };

    }

}

// Splits on sentence-ending punctuation, keeping the punctuation with
// the sentence -- used both to render highlightable spans and to map
// a raw character index (from the TTS engine's word-boundary events)
// back to "which sentence is this word in."
function splitSentences(text: string): string[] {

    const matches = text.match(/[^.!?]+[.!?]*\s*/g);

    return matches ?? [text];

}

export function NarrationControls({ text }: { text: string }) {

    const [prefs, setPrefs] = useState<NarrationPrefs>(loadPrefs);

    const [voices, setVoices] = useState<TTSVoiceOption[]>([]);

    const [status, setStatus] = useState<"idle" | "speaking" | "paused">("idle");

    const [activeSentence, setActiveSentence] = useState(0);

    const sentences = useMemo(() => splitSentences(text), [text]);

    const sentenceStarts = useMemo(() => {

        let offset = 0;

        return sentences.map(sentence => {
            const start = offset;
            offset += sentence.length;
            return start;
        });

    }, [sentences]);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

        setVoices(provider.listVoices());

        // Voice lists load asynchronously in some browsers.
        const handle = () => setVoices(provider.listVoices());

        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.onvoiceschanged = handle;
        }

    }, []);

    useEffect(() => {

        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

    }, [prefs]);

    // Stop narration whenever the underlying text changes (new turn).
    useEffect(() => {

        provider.stop();

        setStatus("idle");

        setActiveSentence(0);

    }, [text]);

    useEffect(() => {

        if (status !== "idle" && containerRef.current) {

            const activeEl = containerRef.current.querySelector("[data-active='true']");

            activeEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });

        }

    }, [activeSentence, status]);

    if (!provider.isSupported()) {
        return null;
    }

    function handlePlay() {

        provider.speak(text, {

            voiceId: prefs.voiceId,

            rate: prefs.rate,

            pitch: prefs.pitch,

            onBoundary: charIndex => {

                let index = 0;

                for (let i = 0; i < sentenceStarts.length; i++) {
                    if (sentenceStarts[i] <= charIndex) index = i;
                }

                setActiveSentence(index);

            },

            onEnd: () => setStatus("idle")

        });

        setStatus("speaking");

    }

    function handlePause() {

        provider.pause();

        setStatus("paused");

    }

    function handleResume() {

        provider.resume();

        setStatus("speaking");

    }

    function handleReplay() {

        provider.stop();

        setActiveSentence(0);

        handlePlay();

    }

    return (
        <div className="mt-3">

            <div
                ref={containerRef}
                aria-live="off"
                className="mb-3 max-h-24 overflow-y-auto text-xs text-parchmentDim/70 leading-relaxed"
            >
                {status !== "idle" && sentences.map((sentence, index) => (
                    <span
                        key={index}
                        data-active={index === activeSentence}
                        className={index === activeSentence ? "bg-ember/25 text-parchment rounded px-0.5" : ""}
                    >
                        {sentence}
                    </span>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">

                {status === "idle" && (
                    <button
                        onClick={handlePlay}
                        className="px-3 py-1.5 rounded-lg bg-ember/15 text-ember hover:bg-ember/25 flex items-center gap-1"
                        aria-label="Read story aloud"
                    >
                        🔊 Read Story
                    </button>
                )}

                {status === "speaking" && (
                    <button
                        onClick={handlePause}
                        className="px-3 py-1.5 rounded-lg bg-mystic/15 text-mystic hover:bg-mystic/25"
                        aria-label="Pause narration"
                    >
                        ⏸ Pause
                    </button>
                )}

                {status === "paused" && (
                    <button
                        onClick={handleResume}
                        className="px-3 py-1.5 rounded-lg bg-mystic/15 text-mystic hover:bg-mystic/25"
                        aria-label="Resume narration"
                    >
                        ▶ Resume
                    </button>
                )}

                {status !== "idle" && (
                    <button
                        onClick={handleReplay}
                        className="px-3 py-1.5 rounded-lg text-parchmentDim hover:text-parchment"
                        aria-label="Replay from the start"
                    >
                        ↺ Replay
                    </button>
                )}

                <label className="flex items-center gap-1 text-parchmentDim">
                    Speed
                    <input
                        type="range"
                        min={0.5}
                        max={1.5}
                        step={0.1}
                        value={prefs.rate}
                        onChange={event => setPrefs(p => ({ ...p, rate: Number(event.target.value) }))}
                        aria-label="Narration speed"
                        className="w-16 accent-ember"
                    />
                </label>

                <label className="flex items-center gap-1 text-parchmentDim">
                    Pitch
                    <input
                        type="range"
                        min={0.5}
                        max={1.5}
                        step={0.1}
                        value={prefs.pitch}
                        onChange={event => setPrefs(p => ({ ...p, pitch: Number(event.target.value) }))}
                        aria-label="Narration pitch"
                        className="w-16 accent-mystic"
                    />
                </label>

                {voices.length > 0 && (
                    <select
                        value={prefs.voiceId ?? ""}
                        onChange={event => setPrefs(p => ({ ...p, voiceId: event.target.value || undefined }))}
                        aria-label="Narration voice"
                        className="bg-night/60 border border-parchmentDim/30 rounded-lg px-2 py-1 text-parchmentDim"
                    >
                        <option value="">Default voice</option>
                        {voices.map(voice => (
                            <option key={voice.id} value={voice.id}>{voice.name} ({voice.lang})</option>
                        ))}
                    </select>
                )}

            </div>

        </div>
    );

}
