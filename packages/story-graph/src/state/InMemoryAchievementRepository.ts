import { AchievementRepository } from "../interfaces/AchievementRepository";
import { Achievement } from "../models/Achievement";

export class InMemoryAchievementRepository implements AchievementRepository {

    private readonly achievements: Achievement[] = [];

    async unlock(
        achievement: Achievement
    ): Promise<void> {

        this.achievements.push(achievement);

    }

    async findByChildId(
        childId: string
    ): Promise<Achievement[]> {

        return this.achievements.filter(achievement => achievement.childId === childId);

    }

    async hasUnlocked(
        childId: string,
        key: string
    ): Promise<boolean> {

        return this.achievements.some(
            achievement => achievement.childId === childId && achievement.key === key
        );

    }

}
