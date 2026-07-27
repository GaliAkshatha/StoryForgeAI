import { useMemo } from "react";

interface Star {
    left: number;
    size: number;
    delay: number;
    duration: number;
    color: string;
}

const COLORS = ["#FFB454", "#4ED9C5", "#F0DFB4"];

export function Starfield({ count = 28 }: { count?: number }) {

    const stars = useMemo<Star[]>(() => {

        return Array.from({ length: count }, () => ({

            left: Math.random() * 100,

            size: 1 + Math.random() * 2.5,

            delay: Math.random() * 10,

            duration: 10 + Math.random() * 10,

            color: COLORS[Math.floor(Math.random() * COLORS.length)]

        }));

        // Deliberately generated once per mount, not on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
            {stars.map((star, index) => (
                <span
                    key={index}
                    className="absolute bottom-0 rounded-full animate-drift opacity-70"
                    style={{
                        left: `${star.left}%`,
                        width: star.size,
                        height: star.size,
                        backgroundColor: star.color,
                        animationDelay: `${star.delay}s`,
                        animationDuration: `${star.duration}s`,
                        boxShadow: `0 0 6px ${star.color}`
                    }}
                />
            ))}
        </div>
    );

}
