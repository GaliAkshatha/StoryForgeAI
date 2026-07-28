import { EmotionProfile } from "../models/EmotionProfile";

export interface EmotionGuidance {

    // True when recent frustration is trending high enough that the
    // next generated content should ease off.
    shouldReduceDifficulty: boolean;

    shouldIncreaseEncouragement: boolean;

    // A short natural-language note to fold into a generation
    // prompt -- never shown to the child.
    promptNote: string;

}

const FRUSTRATION_THRESHOLD = 0.5;

const LOW_CONFIDENCE_THRESHOLD = 0.2;

// Part 5: "Story adapts emotionally. If frustration becomes high,
// reduce puzzle difficulty, increase encouragement." Purely
// arithmetic -- averages the last few recorded emotion snapshots, no
// LLM involved. The guidance it produces is folded into the NEXT
// generation call's prompt (blueprint/expansion), which is where the
// actual adaptation happens.
export class EmotionTrendService {

    guidance(
        recentEmotions: EmotionProfile[]
    ): EmotionGuidance {

        if (recentEmotions.length === 0) {

            return {
                shouldReduceDifficulty: false,
                shouldIncreaseEncouragement: false,
                promptNote: "No emotional history yet -- proceed normally."
            };

        }

        const avgFrustration = this.average(recentEmotions, "frustration");

        const avgConfidence = this.average(recentEmotions, "confidence");

        const shouldReduceDifficulty = avgFrustration >= FRUSTRATION_THRESHOLD;

        const shouldIncreaseEncouragement =
            shouldReduceDifficulty || avgConfidence <= LOW_CONFIDENCE_THRESHOLD;

        let promptNote = "Emotional trend is steady -- proceed normally.";

        if (shouldReduceDifficulty) {

            promptNote =
                "Recent frustration has been trending high. Make the next stretch of " +
                "story gentler: lower difficulty, give the child an easy early win, " +
                "and let a character offer warm encouragement without mentioning " +
                "frustration directly.";

        }
        else if (shouldIncreaseEncouragement) {

            promptNote =
                "Recent confidence has been trending low. Give the child a clear, " +
                "achievable moment to feel capable, and have a character notice " +
                "their effort warmly.";

        }

        return { shouldReduceDifficulty, shouldIncreaseEncouragement, promptNote };

    }

    private average(
        emotions: EmotionProfile[],
        key: keyof EmotionProfile
    ): number {

        return emotions.reduce((sum, emotion) => sum + emotion[key], 0) / emotions.length;

    }

}
