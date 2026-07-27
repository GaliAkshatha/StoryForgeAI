// A parent's free-form learning goal ("I want my daughter to
// understand honesty"), converted into a form the rest of the
// platform can actually use. The child never sees any of this --
// moral seeds the Consequence Engine's prompts, which are explicitly
// instructed to teach through situations, never through preaching.
export interface LearningObjective {

    // A concrete, story-usable articulation of the parent's goal --
    // not a restatement of it, a *situation-shaped* version of it.
    // e.g. parent goal "my son struggles with losing" becomes
    // something like "facing a real setback and choosing to keep
    // going anyway matters more than winning."
    moral: string;

    // 1-3 short lowercase tags naming the value(s) this goal is
    // really about (e.g. "honesty", "resilience"). Free-form, not
    // constrained to a fixed enum -- these feed the same
    // SkillSignal.skill field the Analytics Agent already uses, so a
    // parent's own words can become a tracked trend.
    skillFocus: string[];

    // Learning domain used to scope Hybrid RAG retrieval, one of the
    // Master Prompt's Final Goal list (leadership, history,
    // cybersecurity, business, science, healthcare, ethics) or
    // "general" if none clearly fits.
    domain: string;

    // A one-sentence explanation of the interpretation, shown only
    // to the parent (e.g. as a confirmation step before an adventure
    // starts) -- never to the child.
    rationale: string;

}
