interface EmberSpriteProps {

    size?: number;

    mood?: "idle" | "excited" | "thinking";

}

// A small dragon-kin spark spirit: rounded body, two curled ear-wisps,
// big friendly eyes, a flame-tuft tail. Built as plain SVG (no image
// assets) so it's crisp at any size and easy to re-color per theme.
export function EmberSprite({ size = 88, mood = "idle" }: EmberSpriteProps) {

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* ambient glow */}
            <circle cx="60" cy="64" r="46" fill="url(#emberGlow)" className="animate-pulseGlow" />

            <defs>
                <radialGradient id="emberGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFB454" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#FFB454" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="emberBody" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFCB7D" />
                    <stop offset="100%" stopColor="#FF9D3D" />
                </linearGradient>
            </defs>

            {/* tail flame-tuft */}
            <path
                d="M84 78c10 2 16 12 10 22-2-6-8-9-8-9s6 5 4 12c-6-3-12-10-13-19-1-4 1-6 7-6z"
                fill="#FF9D3D"
                opacity="0.9"
            />

            {/* ear wisps */}
            <path d="M42 40c-6-10-4-20 2-24 0 8 2 14 6 18l-8 6z" fill="url(#emberBody)" />
            <path d="M78 40c6-10 4-20-2-24 0 8-2 14-6 18l8 6z" fill="url(#emberBody)" />

            {/* body */}
            <ellipse cx="60" cy="66" rx="30" ry="28" fill="url(#emberBody)" />

            {/* belly */}
            <ellipse cx="60" cy="74" rx="16" ry="13" fill="#FFE3B0" opacity="0.85" />

            {/* eyes */}
            <g className="animate-blink" style={{ transformOrigin: "60px 60px" }}>
                <ellipse cx="50" cy="60" rx="4.5" ry="6" fill="#2A1440" />
                <ellipse cx="70" cy="60" rx="4.5" ry="6" fill="#2A1440" />
                <circle cx="48.5" cy="57.5" r="1.4" fill="#FFF" />
                <circle cx="68.5" cy="57.5" r="1.4" fill="#FFF" />
            </g>

            {/* cheeks / mood accents */}
            {mood === "excited" && (
                <>
                    <circle cx="42" cy="68" r="4" fill="#FF6B81" opacity="0.55" />
                    <circle cx="78" cy="68" r="4" fill="#FF6B81" opacity="0.55" />
                </>
            )}

            {/* mouth */}
            {mood === "thinking" ? (
                <path d="M54 76c3 2 9 2 12 0" stroke="#2A1440" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            ) : (
                <path d="M52 75c4 4 12 4 16 0" stroke="#2A1440" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            )}
        </svg>
    );

}
