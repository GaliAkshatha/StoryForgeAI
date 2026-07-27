import { ButtonHTMLAttributes } from "react";

interface RuneButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {

    variant?: "primary" | "secondary" | "ghost";

}

export function RuneButton({
    variant = "primary",
    className = "",
    children,
    ...rest
}: RuneButtonProps) {

    const base =
        "relative px-5 py-3 rounded-xl font-body font-bold tracking-wide transition-transform duration-150 " +
        "hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none";

    const variants: Record<string, string> = {

        primary:
            "bg-ember text-night shadow-glow hover:shadow-[0_0_32px_rgba(255,180,84,0.65)]",

        secondary:
            "bg-transparent border-2 border-mystic text-mystic hover:bg-mystic/10 hover:shadow-glowMystic",

        ghost:
            "bg-transparent text-parchmentDim hover:text-parchment underline decoration-dotted underline-offset-4"

    };

    return (
        <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
            {children}
        </button>
    );

}
