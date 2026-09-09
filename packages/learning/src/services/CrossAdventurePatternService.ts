import { LearningRepository } from "../repositories/LearningRepository";
import { TRAIT_COPY } from "../models/traitCopy";

export interface SkillPattern {

    skill: string;

    label: string;

    // "What we observed" -- plain-language description of the
    // pattern itself, not a verdict on the child.
    whatWeObserved: string;

    // How many of the considered adventures showed this trait with a
    // clearly positive signal (delta above the threshold below).
    timesObserved: number;

    adventuresConsidered: number;

    // A concrete, specific behaviorNote from the most recent
    // adventure that showed this signal -- "In a recent adventure,
    // you asked why..." instead of a generic trait score. Undefined
    // if no adventure recorded a specific note for this trait.
    recentExample?: string;

    encouragementPrompt: string;

}

// A signal counts as "observed" for pattern purposes above this
// delta -- filters out noise (a single incidental, weakly-weighted
// event) from a genuine, repeated pattern. Matches the existing
// DeterministicAnalyticsEngine convention of deltas roughly in -1..1.
const OBSERVATION_THRESHOLD = 0.15;

// A pattern is only worth showing a parent once it's shown up more
// than once -- a single adventure isn't a pattern, it's an anecdote.
const MIN_OCCURRENCES_FOR_PATTERN = 2;

// How many of the child's most recent adventures to consider. Recent
// on purpose, not their whole history -- a pattern from six months
// ago is a different question than "what's true of my child now."
const DEFAULT_LOOKBACK = 8;

// Cross-adventure pattern detection: the piece the single-adventure
// DeterministicAnalyticsEngine was never meant to do on its own. That
// engine answers "what did THIS adventure show" -- this answers "what
// keeps showing up across adventures," which is what actually turns
// individual pieces of evidence into something a parent can act on.
// Purely aggregation over already-persisted, already-deterministic
// LearningAnalytics records -- no LLM call, no new scoring logic.
export class CrossAdventurePatternService {

    constructor(
        private readonly learningRepository: LearningRepository
    ) {}

    async getPatterns(
        childId: string,
        lookback: number = DEFAULT_LOOKBACK
    ): Promise<SkillPattern[]> {

        const allRecords = await this.learningRepository.findByChildId(childId);

        const recent = [...allRecords]
            .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
            .slice(0, lookback);

        if (recent.length === 0) {
            return [];
        }

        const bySkill = new Map<string, { occurrences: number; recentExample?: string }>();

        for (const record of recent) {

            for (const signal of record.skillSignals) {

                if (signal.delta < OBSERVATION_THRESHOLD) {
                    continue;
                }

                const entry = bySkill.get(signal.skill) ?? { occurrences: 0, recentExample: undefined };

                entry.occurrences += 1;

                // Only ever take the example from the recency-sorted
                // list's first (most recent) matching record -- once
                // set, never overwritten by an older one.
                if (!entry.recentExample) {

                    entry.recentExample = record.behaviorNotes.find(note =>
                        note.toLowerCase().includes(signal.skill.replace(/_/g, " "))
                    ) ?? record.behaviorNotes[0];

                }

                bySkill.set(signal.skill, entry);

            }

        }

        const patterns: SkillPattern[] = [];

        for (const [skill, entry] of bySkill.entries()) {

            if (entry.occurrences < MIN_OCCURRENCES_FOR_PATTERN) {
                continue;
            }

            const copy = TRAIT_COPY[skill as keyof typeof TRAIT_COPY];

            // A skill signal outside the 14 canonical traits (a
            // parent's own free-form wording, see TraitName.ts's own
            // comment on this) has no copy to draw from -- skip it
            // here rather than show an unlabeled pattern; the
            // per-adventure summary already surfaces it elsewhere.
            if (!copy) {
                continue;
            }

            patterns.push({

                skill,

                label: copy.label,

                whatWeObserved: `In ${entry.occurrences} of your last ${recent.length} adventures, ${copy.description}`,

                timesObserved: entry.occurrences,

                adventuresConsidered: recent.length,

                recentExample: entry.recentExample,

                encouragementPrompt: copy.encouragementPrompt

            });

        }

        return patterns.sort((a, b) => b.timesObserved - a.timesObserved);

    }

}
