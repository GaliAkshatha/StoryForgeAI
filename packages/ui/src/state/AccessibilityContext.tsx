import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AccessibilitySettings {

    highContrast: boolean;

    dyslexiaFont: boolean;

    reducedMotion: boolean;

}

interface AccessibilityState extends AccessibilitySettings {

    toggle: (key: keyof AccessibilitySettings) => void;

}

const STORAGE_KEY = "storyforge_accessibility";

const DEFAULTS: AccessibilitySettings = {

    highContrast: false,

    dyslexiaFont: false,

    reducedMotion: false

};

const AccessibilityContext = createContext<AccessibilityState | undefined>(undefined);

function loadSettings(): AccessibilitySettings {

    try {

        const raw = localStorage.getItem(STORAGE_KEY);

        return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;

    }
    catch {

        return DEFAULTS;

    }

}

// Part 13: keyboard navigation and large click targets are handled
// structurally (real <button> elements throughout, :focus-visible
// styling in index.css). This context covers the three toggleable
// preferences: high contrast, a dyslexia-friendly font, and a manual
// reduced-motion override (in addition to the OS-level
// prefers-reduced-motion media query already respected globally).
// Captions are effectively always-on -- StoryForge is text-first, so
// narration (see narration/) never hides the underlying text.
export function AccessibilityProvider({ children }: { children: ReactNode }) {

    const [settings, setSettings] = useState<AccessibilitySettings>(loadSettings);

    useEffect(() => {

        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

        const root = document.documentElement;

        root.classList.toggle("a11y-high-contrast", settings.highContrast);

        root.classList.toggle("a11y-dyslexia-font", settings.dyslexiaFont);

        root.classList.toggle("a11y-reduced-motion", settings.reducedMotion);

    }, [settings]);

    const toggle = (key: keyof AccessibilitySettings) => {

        setSettings(current => ({ ...current, [key]: !current[key] }));

    };

    return (
        <AccessibilityContext.Provider value={{ ...settings, toggle }}>
            {children}
        </AccessibilityContext.Provider>
    );

}

export function useAccessibility(): AccessibilityState {

    const context = useContext(AccessibilityContext);

    if (!context) {

        throw new Error("useAccessibility must be used within an AccessibilityProvider.");

    }

    return context;

}
