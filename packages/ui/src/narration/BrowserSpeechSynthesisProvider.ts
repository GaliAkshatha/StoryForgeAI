import { TTSProvider, TTSVoiceOption, SpeakOptions } from "./TTSProvider";

// Default provider: the browser's native Speech Synthesis API. No
// API key, no cost, works offline. See TTSProvider for the swap-in
// point for a premium provider later.
export class BrowserSpeechSynthesisProvider implements TTSProvider {

    isSupported(): boolean {

        return typeof window !== "undefined" && "speechSynthesis" in window;

    }

    listVoices(): TTSVoiceOption[] {

        if (!this.isSupported()) {
            return [];
        }

        return window.speechSynthesis.getVoices().map(voice => ({

            id: voice.voiceURI,

            name: voice.name,

            lang: voice.lang

        }));

    }

    speak(text: string, options: SpeakOptions): void {

        if (!this.isSupported()) {
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.rate = options.rate ?? 1;

        utterance.pitch = options.pitch ?? 1;

        if (options.lang) {
            utterance.lang = options.lang;
        }

        if (options.voiceId) {

            const voice = window.speechSynthesis
                .getVoices()
                .find(v => v.voiceURI === options.voiceId);

            if (voice) {
                utterance.voice = voice;
            }

        }

        if (options.onBoundary) {

            utterance.onboundary = event => {

                options.onBoundary?.(event.charIndex);

            };

        }

        if (options.onEnd) {

            utterance.onend = () => options.onEnd?.();

        }

        window.speechSynthesis.speak(utterance);

    }

    pause(): void {

        if (this.isSupported()) {
            window.speechSynthesis.pause();
        }

    }

    resume(): void {

        if (this.isSupported()) {
            window.speechSynthesis.resume();
        }

    }

    stop(): void {

        if (this.isSupported()) {
            window.speechSynthesis.cancel();
        }

    }

}
