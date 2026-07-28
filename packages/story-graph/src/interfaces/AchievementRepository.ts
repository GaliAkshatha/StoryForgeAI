import { Achievement } from "../models/Achievement";

export interface AchievementRepository {

    unlock(
        achievement: Achievement
    ): Promise<void>;

    findByChildId(
        childId: string
    ): Promise<Achievement[]>;

    hasUnlocked(
        childId: string,
        key: string
    ): Promise<boolean>;

}
