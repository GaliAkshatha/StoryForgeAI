import { EmotionTrendService } from "../services/EmotionTrendService";
import { neutralEmotionProfile } from "../models/EmotionProfile";

function main(): void {

    const service = new EmotionTrendService();

    // --- No history ---

    const empty = service.guidance([]);

    console.assert(
        !empty.shouldReduceDifficulty && !empty.shouldIncreaseEncouragement,
        "Expected no adjustment with no emotional history"
    );

    // --- Low frustration, high confidence: steady ---

    const calm = service.guidance([
        { ...neutralEmotionProfile(), frustration: 0.1, confidence: 0.7 },
        { ...neutralEmotionProfile(), frustration: 0.2, confidence: 0.6 }
    ]);

    console.assert(
        !calm.shouldReduceDifficulty && !calm.shouldIncreaseEncouragement,
        "Expected no adjustment for a calm, confident trend"
    );

    // --- High frustration: trigger difficulty reduction + encouragement ---

    const frustrated = service.guidance([
        { ...neutralEmotionProfile(), frustration: 0.8 },
        { ...neutralEmotionProfile(), frustration: 0.6 }
    ]);

    console.assert(
        frustrated.shouldReduceDifficulty && frustrated.shouldIncreaseEncouragement,
        "Expected both flags set for a high-frustration trend"
    );

    console.assert(
        frustrated.promptNote.toLowerCase().includes("gentler"),
        "Expected the prompt note to describe easing off"
    );

    // --- Low confidence alone (no frustration): encouragement only ---

    const uncertain = service.guidance([
        { ...neutralEmotionProfile(), frustration: 0.1, confidence: 0.1 }
    ]);

    console.assert(
        !uncertain.shouldReduceDifficulty && uncertain.shouldIncreaseEncouragement,
        "Expected encouragement without difficulty reduction for low confidence alone"
    );

    console.log("EmotionTrendService tests passed.");

}

main();
