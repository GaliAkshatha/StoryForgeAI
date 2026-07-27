/** @type {import('tailwindcss').Config} */
export default {

    content: ["./index.html", "./src/**/*.{ts,tsx}"],

    theme: {

        extend: {

            colors: {

                // "The Study" / "The Storybook" palette -- named
                // tokens, not raw hex sprinkled through components.
                night: "#1B1035",
                twilight: "#3B2465",
                twilightLight: "#4E3080",
                parchment: "#F0DFB4",
                parchmentDim: "#D8C592",
                ember: "#FFB454",
                emberDim: "#B87A2E",
                mystic: "#4ED9C5",
                rose: "#FF6B81"

            },

            fontFamily: {

                display: ["\"Cinzel Decorative\"", "serif"],

                body: ["Nunito", "sans-serif"],

                data: ["\"IBM Plex Mono\"", "monospace"]

            },

            boxShadow: {

                glow: "0 0 24px rgba(255, 180, 84, 0.45)",

                glowMystic: "0 0 24px rgba(78, 217, 197, 0.4)",

                page: "0 20px 60px rgba(0, 0, 0, 0.45)"

            },

            keyframes: {

                float: {

                    "0%, 100%": { transform: "translateY(0px) rotate(-2deg)" },

                    "50%": { transform: "translateY(-10px) rotate(2deg)" }

                },

                pulseGlow: {

                    "0%, 100%": { opacity: "0.55", transform: "scale(1)" },

                    "50%": { opacity: "1", transform: "scale(1.08)" }

                },

                drift: {

                    "0%": { transform: "translateY(0) translateX(0)" },

                    "100%": { transform: "translateY(-120vh) translateX(20px)" }

                },

                blink: {

                    "0%, 92%, 100%": { transform: "scaleY(1)" },

                    "96%": { transform: "scaleY(0.1)" }

                },

                popIn: {

                    "0%": { opacity: "0", transform: "translateY(6px) scale(0.96)" },

                    "100%": { opacity: "1", transform: "translateY(0) scale(1)" }

                }

            },

            animation: {

                float: "float 4.5s ease-in-out infinite",

                pulseGlow: "pulseGlow 2.4s ease-in-out infinite",

                drift: "drift 14s linear infinite",

                blink: "blink 5s ease-in-out infinite",

                popIn: "popIn 0.25s ease-out"

            }

        }

    },

    plugins: []

};
