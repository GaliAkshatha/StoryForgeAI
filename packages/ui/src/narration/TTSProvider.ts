export interface TTSVoiceOption {

    id: string;

    name: string;

    lang: string;

}

export interface SpeakOptions {

    voiceId?: string;

    rate?: number;

    pitch?: number;

    lang?: string;

    // Called with the character index currently being spoken, so the
    // UI can highlight the active sentence.
    onBoundary?: (charIndex: number) => void;

    onEnd?: () => void;

}

// Part 12: "Use browser-native Speech Synthesis API by default...
// Provide abstraction so premium TTS providers (Google Cloud TTS,
// ElevenLabs, Azure Speech) can be integrated later without changing
// the UI." Every consumer (NarrationControls) depends only on this
// interface -- swapping BrowserSpeechSynthesisProvider for a premium
// implementation is a one-line change at the call site, same
// provider-abstraction pattern already used for the LLM client.
export interface TTSProvider {

    listVoices(): TTSVoiceOption[];

    speak(text: string, options: SpeakOptions): void;

    pause(): void;

    resume(): void;

    stop(): void;

    isSupported(): boolean;

}
