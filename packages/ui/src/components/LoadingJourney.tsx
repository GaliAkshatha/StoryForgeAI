import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ParchmentCard } from "./ParchmentCard";

interface LoadingJourneyProps {

    messages: string[];

    // How long each message stays up before rotating to the next,
    // in milliseconds. The LAST message in the list is sticky (never
    // rotates away) -- it's meant to be something like "Almost
    // ready...", shown while genuinely waiting on the network, not
    // implying a fixed remaining time.
    intervalMs?: number;

}

// Replaces a bare spinner with a short sequence of messages plus an
// animated progress indicator -- "never leave the user staring at a
// spinner." Purely presentational: has no idea how long the real
// request will take, so the sequence just cycles through until the
// caller unmounts it (the request resolving).
export function LoadingJourney({ messages, intervalMs = 1800 }: LoadingJourneyProps) {

    const [index, setIndex] = useState(0);

    useEffect(() => {

        if (index >= messages.length - 1) {
            return;
        }

        const timer = setTimeout(() => setIndex(current => current + 1), intervalMs);

        return () => clearTimeout(timer);

    }, [index, messages.length, intervalMs]);

    return (
        <ParchmentCard>
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-5 py-8">

                <div className="relative w-14 h-14" aria-hidden="true">

                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-ember/25"
                    />

                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-ember"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    />

                    <motion.div
                        className="absolute inset-3 rounded-full bg-ember/15"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />

                </div>

                <AnimatePresence mode="wait">

                    <motion.p
                        key={index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="text-parchmentDim text-sm text-center font-body"
                    >
                        {messages[index]}
                    </motion.p>

                </AnimatePresence>

                <div className="flex gap-1.5" aria-hidden="true">

                    {messages.map((_, dotIndex) => (

                        <motion.div
                            key={dotIndex}
                            className="w-1.5 h-1.5 rounded-full bg-parchmentDim/30"
                            animate={{
                                backgroundColor: dotIndex <= index
                                    ? "rgba(255, 180, 84, 0.9)"
                                    : "rgba(216, 197, 146, 0.3)"
                            }}
                            transition={{ duration: 0.3 }}
                        />

                    ))}

                </div>

            </div>
        </ParchmentCard>
    );

}
