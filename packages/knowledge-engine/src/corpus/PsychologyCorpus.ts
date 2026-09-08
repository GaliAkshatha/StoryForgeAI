import { KnowledgeChunk } from "../models/KnowledgeChunk";

// Curated psychology + narrative-realism corpus.
//
// Purpose: injected into the knowledge base at startup so the adventure
// blueprint generator (the one expensive LLM call per adventure) receives
// grounded human-psychology context alongside the scene/moral query.
// This is what makes characters feel like real people with real emotional
// logic rather than flat, alien NPCs.
//
// Each chunk encodes a self-contained psychological or narrative truth.
// Kept short (~60-120 words each) so retrieval returns tight, precise
// context rather than vague paragraphs. The `metadata.archetype` field
// is a routing hint for future filtering.
export const PSYCHOLOGY_CORPUS: KnowledgeChunk[] = [

    // ----------------------------------------------------------------
    // Moral Development (Piaget / Kohlberg — child-adapted)
    // ----------------------------------------------------------------

    {
        id: "psy-moral-fairness",
        domain: "psychology",
        source: "Moral Development (Piaget/Kohlberg)",
        text: `Children between 6-11 understand fairness in concrete, reciprocal terms:
"you get what you deserve," "if you help me, I'll help you." When a character
breaks this rule — taking more than their share, breaking a promise — the child
reading feels it viscerally as a violation of an understood social contract.
A good moral dilemma exploits this: it puts two fair things in direct conflict
(honesty vs. protecting a friend) so there is no obviously "correct" answer.`,
        metadata: { archetype: "moral_dilemma", ageRange: "6-12" }
    },

    {
        id: "psy-guilt-repair",
        domain: "psychology",
        source: "Moral Development (Kohlberg Stage 2-3)",
        text: `Genuine guilt in children manifests not as shame-spiral but as an urgent
need to *repair*: to apologize, give back what was taken, fix what was broken.
A character who has done something wrong and then actively tries to make it
right — even imperfectly, even too late — is psychologically believable.
Characters who simply "feel bad" without any repair impulse read as flat.
The repair attempt, successful or not, is the emotionally true moment.`,
        metadata: { archetype: "redemption", theme: "guilt" }
    },

    {
        id: "psy-fairness-envy",
        domain: "psychology",
        source: "Social Comparison Theory (Festinger)",
        text: `Envy arises from seeing someone else have something you believe you deserve.
It's distinct from jealousy (which fears losing what you have). In children's
stories, envy is often the hidden engine of conflict: the rival doesn't hate
the hero — they want what the hero has and can't admit it. Acknowledging this
internal logic gives the antagonist emotional complexity and makes moral
resolution genuinely satisfying rather than a simple defeat.`,
        metadata: { archetype: "rival", theme: "envy" }
    },

    // ----------------------------------------------------------------
    // Belonging, Exclusion & Identity
    // ----------------------------------------------------------------

    {
        id: "psy-belonging",
        domain: "psychology",
        source: "Maslow / Baumeister & Leary (Belongingness Hypothesis)",
        text: `The need to belong is one of the most powerful human motivators. Exclusion
from a group triggers the same neural pathways as physical pain. A character
who is left out — even briefly, even unintentionally — will feel it as a
threat to their identity, not merely as inconvenience. Stories that make
belonging feel genuinely at stake (not just "will they be friends?") create
real emotional tension. The moment of acceptance or continued rejection
carries weight because the need is real.`,
        metadata: { archetype: "outcast", theme: "belonging" }
    },

    {
        id: "psy-peer-pressure",
        domain: "psychology",
        source: "Developmental Psychology — Peer Conformity",
        text: `Children and young adolescents are acutely sensitive to peer judgment. The
fear of "looking stupid" or "being different" can override knowing the right
thing to do. This is not weakness — it's a developmentally normal cost-benefit
calculation. A protagonist who knows the right answer but hesitates because
they're afraid of what the group will think is behaving in a psychologically
truthful way. The act of speaking up despite this fear is the moment of genuine
courage, not swordfighting.`,
        metadata: { archetype: "reluctant_hero", theme: "courage" }
    },

    {
        id: "psy-identity-crisis",
        domain: "psychology",
        source: "Erik Erikson — Industry vs Inferiority",
        text: `Children 6-12 are in the "industry vs. inferiority" stage: their self-worth
is tightly linked to whether they believe they are competent and capable.
A character who fails at something they care about doesn't just feel sad —
they feel a threat to their core identity ("I'm not good at this, maybe I'm
not good at anything"). The meaningful emotional arc is not removing the
failure but reframing it: the failure taught something that success couldn't.`,
        metadata: { archetype: "failure_arc", theme: "perseverance" }
    },

    // ----------------------------------------------------------------
    // Conflict, Trust & Relationship Dynamics
    // ----------------------------------------------------------------

    {
        id: "psy-trust-betrayal",
        domain: "psychology",
        source: "Interpersonal Trust Research (Rotter / Erikson)",
        text: `Trust is built slowly through consistent small actions and destroyed quickly
through a single clear betrayal. In narrative, the moment of betrayal lands
hardest when the reader understands *why* it happened — not because the
character is evil, but because they were scared, or desperate, or made a
wrong calculation. This makes the repair of trust (if it comes) genuinely
meaningful: the characters must rebuild something real, not just declare
forgiveness.`,
        metadata: { archetype: "betrayal", theme: "trust" }
    },

    {
        id: "psy-conflict-resolution",
        domain: "psychology",
        source: "Conflict Resolution Research (Thomas-Kilmann)",
        text: `Real conflict resolution between people rarely ends in total victory for one
side. The most emotionally satisfying resolutions involve both parties giving
something up and gaining something in return — a compromise that neither
would have predicted at the start. The character who finds this unexpected
middle ground demonstrates sophisticated emotional and social intelligence.
Stories where one side simply "wins" and the other "loses" leave readers
feeling the conflict wasn't real.`,
        metadata: { archetype: "resolution", theme: "empathy" }
    },

    {
        id: "psy-apology-dynamics",
        domain: "psychology",
        source: "Psychology of Apology (Lazare)",
        text: `A genuine apology has four components: acknowledgment of the offense, the
expression of remorse, the explanation of what went wrong (without excusing
it), and an offer of repair. Characters who deliver only half an apology
("I'm sorry you feel that way") create realistic tension because the other
character is right not to accept it — it wasn't real. A full, humble apology
from a character who had previously been proud or defensive is one of the
most emotionally powerful moments a story can deliver.`,
        metadata: { archetype: "redemption", theme: "accountability" }
    },

    // ----------------------------------------------------------------
    // Fear, Courage & The Reluctant Hero
    // ----------------------------------------------------------------

    {
        id: "psy-courage-as-choice",
        domain: "psychology",
        source: "Positive Psychology (Seligman) + Aristotle — Nicomachean Ethics",
        text: `Courage is not the absence of fear — it is acting despite fear. The most
believable brave characters are not fearless; they are afraid and act anyway.
A protagonist who steps forward while visibly trembling is more compelling
than one who charges in without hesitation. The presence of genuine fear
also gives the moment of action its weight: if there was nothing at stake
emotionally, the act of bravery means nothing.`,
        metadata: { archetype: "reluctant_hero", theme: "courage" }
    },

    {
        id: "psy-phobia-realistic",
        domain: "psychology",
        source: "Clinical Psychology — Specific Phobias",
        text: `Children's fears are often about loss of control and unpredictability, not
just the feared object itself. A character afraid of the dark forest is not
afraid of trees — they're afraid of not knowing what comes next, of being
caught without a plan. Good fantasy maps psychological fears onto physical
obstacles: the dark forest IS uncertainty; the monster IS the thing they
can't control. Characters who name and confront their psychological reality
— not just the physical obstacle — feel psychologically true.`,
        metadata: { archetype: "fear_confrontation", theme: "perseverance" }
    },

    // ----------------------------------------------------------------
    // Narrative Realism & Story Archetypes
    // ----------------------------------------------------------------

    {
        id: "psy-mentor-failure",
        domain: "psychology",
        source: "Narrative Psychology (Bruner) + Hero's Journey (Campbell)",
        text: `The most psychologically interesting mentor figures fail at a crucial moment.
Not because they are incompetent, but because the protagonist has grown to a
point where the mentor's guidance is no longer sufficient — the young hero
must find an answer the mentor doesn't have. This structural beat mirrors
the real experience of growing up: discovering that trusted adults are also
uncertain, also wrong sometimes, also limited. This makes the hero's own
choice feel more earned.`,
        metadata: { archetype: "mentor", theme: "growth" }
    },

    {
        id: "psy-misunderstood-rival",
        domain: "psychology",
        source: "Attribution Theory (Heider) + Narrative Empathy",
        text: `The most compelling antagonists are not evil — they are people whose needs
went unmet in a way that led to harmful behavior. The misunderstood rival
didn't choose cruelty; they chose self-protection. When the protagonist
discovers this — the rival was mocked first, or lost something they loved,
or is terrified of something real — the moral resolution shifts from "defeat
the bad guy" to "understand the person." This is psychologically richer and
models genuine empathy for real children.`,
        metadata: { archetype: "antagonist", theme: "empathy" }
    },

    {
        id: "psy-choice-consequences",
        domain: "psychology",
        source: "Behavioral Economics (Kahneman) + Moral Psychology",
        text: `The most meaningful choices in stories are ones where both options cost
something real. "Help your friend or save yourself" lands because both are
legitimate values in conflict. Choices where one option is obviously right
aren't really choices — they're tests of obedience. A story that presents
a genuine dilemma, where the reader genuinely isn't sure what to do, creates
the emotional engagement that produces actual learning. The discomfort of
uncertainty is the experience of real moral reasoning.`,
        metadata: { archetype: "moral_dilemma", theme: "decision_making" }
    },

    {
        id: "psy-resilience-process",
        domain: "psychology",
        source: "Resilience Research (Masten) — Ordinary Magic",
        text: `Resilience is not a trait some children have and others don't. It is a
process: name what happened, feel the feeling fully (don't skip it), find
one thing that is still in your control, and take one small action. Characters
who demonstrate resilience should show this process, not just magically
recover. The moment of naming the feeling out loud — "This isn't fair and
I'm furious" — before choosing to keep going anyway is the psychologically
authentic resilience beat.`,
        metadata: { archetype: "resilience", theme: "perseverance" }
    },

    {
        id: "psy-helping-intrinsic",
        domain: "psychology",
        source: "Self-Determination Theory (Deci & Ryan)",
        text: `Intrinsically motivated helping — doing something kind because it feels right,
not for a reward — produces a distinct and lasting positive feeling called
"helper's high." Characters who help others without expecting anything in
return, and then receive an unexpected emotional payoff (belonging, trust,
self-respect), model the intrinsic value of prosocial behavior. This is more
powerful than reward-based helping precisely because the child reader
understands: the good feeling was the point, not a bonus.`,
        metadata: { archetype: "helper", theme: "empathy" }
    },

    {
        id: "psy-fantasy-realism",
        domain: "psychology",
        source: "Fantasy Fiction Psychology — Tolkien, Le Guin, Rowling",
        text: `The best children's fantasy works because the emotional truth is entirely
realistic even when the setting is not. Frodo's fear of the Shire ending is
recognizable to anyone who has feared change. Harry's longing for a family
is universal. Ged's hubris destroying what he built reflects real human
pride. Fantasy's power is to externalize internal psychological states into
physical adventure: the dark forest is loneliness, the dragon is anger, the
enchanted mirror is self-deception. Stories that honor this mapping feel
real even in impossible settings.`,
        metadata: { archetype: "fantasy_realism", theme: "all" }
    }

];
