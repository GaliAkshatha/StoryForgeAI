import { useState } from "react";
import { useAccessibility } from "../state/AccessibilityContext";

export function AccessibilityMenu() {

    const { highContrast, dyslexiaFont, reducedMotion, toggle } = useAccessibility();

    const [open, setOpen] = useState(false);

    return (
        <div className="fixed top-4 right-4 z-50">

            <button
                onClick={() => setOpen(current => !current)}
                aria-expanded={open}
                aria-label="Accessibility settings"
                className="w-10 h-10 rounded-full bg-twilight border border-parchmentDim/30 text-parchment flex items-center justify-center hover:border-ember"
            >
                &#9855;
            </button>

            {open && (
                <div
                    role="menu"
                    className="mt-2 parchment-panel rounded-xl p-4 w-56 flex flex-col gap-3 text-sm shadow-page"
                >

                    <ToggleRow
                        label="High contrast"
                        checked={highContrast}
                        onChange={() => toggle("highContrast")}
                    />

                    <ToggleRow
                        label="Dyslexia-friendly font"
                        checked={dyslexiaFont}
                        onChange={() => toggle("dyslexiaFont")}
                    />

                    <ToggleRow
                        label="Reduce motion"
                        checked={reducedMotion}
                        onChange={() => toggle("reducedMotion")}
                    />

                </div>
            )}

        </div>
    );

}

function ToggleRow({
    label,
    checked,
    onChange
}: {
    label: string;
    checked: boolean;
    onChange: () => void;
}) {

    return (
        <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-parchmentDim">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="w-5 h-5 accent-ember"
            />
        </label>
    );

}
