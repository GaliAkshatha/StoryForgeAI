import { EmotionProfile } from "./EmotionProfile";

// Phase 9: a dedicated, queryable emotion history -- distinct from
// AdventureEvent (which only snapshots emotion on notable
// eventType-tagged nodes). EmotionRepository records EVERY turn's
// emotion, giving EmotionTracker a complete signal to trend against,
// scoped per child across their whole history (not just one
// session).
export interface EmotionState {

    id: string;

    childId: string;

    sessionId: string;

    worldId: string;

    emotion: EmotionProfile;

    recordedAt: string;

}
