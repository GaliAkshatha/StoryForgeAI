// A small, dependency-free deterministic PRNG (mulberry32). Not
// cryptographically secure -- not meant to be. Its only job is
// "same seed -> same sequence of numbers", which is what makes
// EventScorer's selection reproducible for testing (Phase P: "same
// initial state + same seed + same choices = same engine behavior").
export class SeededRandom {

    private state: number;

    constructor(seed: number) {

        // Ensure a non-zero 32-bit starting state regardless of what
        // seed is passed in.
        this.state = seed >>> 0 || 1;

    }

    // Returns a float in [0, 1).
    next(): number {

        this.state |= 0;

        this.state = (this.state + 0x6D2B79F5) | 0;

        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);

        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

    }

    // Deterministic string -> 32-bit seed, so callers can seed from
    // something meaningful (e.g. `${worldId}:${turn}`) instead of
    // juggling raw numbers everywhere.
    static seedFromString(input: string): number {

        let hash = 0;

        for (let i = 0; i < input.length; i++) {

            hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;

        }

        return hash >>> 0;

    }

}
