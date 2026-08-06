// Shared, deterministic text-assembly helpers used by both
// ChoiceTextBuilder and SemanticEventBuilder. Extracted after three
// rounds of independently-diverging fixes to duplicated copies of
// these same functions produced real, observed bugs:
//
//   - naive word-count truncation cut sentences on a dangling
//     conjunction ("a berry basket is spilled and" -- word 7 was
//     "scattered", dropped, leaving "and" stranded at the end)
//   - templates then concatenated fixed boilerplate onto that
//     already-broken fragment ("and" + "and tries..." -> "and and")
//   - trailing commas from embedded clauses were never stripped
//     before a final period was appended ("who saw everything,.")
//
// Single source of truth now, so a fix here fixes both builders at
// once instead of needing to be repeated.

const TRAILING_STOPWORDS = new Set([
    "and", "or", "but", "the", "a", "an", "who", "which", "that",
    "with", "to", "of", "in", "on", "at", "for", "near", "by"
]);

// Truncates to at most maxWords words, then keeps trimming trailing
// stopwords until the fragment ends on a real content word (or is
// empty) -- so truncation can never leave a dangling "and"/"the"/etc.
export function shortenSafely(
    text: string | undefined,
    maxWords: number = 6
): string | undefined {

    if (!text) {
        return undefined;
    }

    let words = text.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length > maxWords) {
        words = words.slice(0, maxWords);
    }

    while (words.length > 0 && TRAILING_STOPWORDS.has(words[words.length - 1].toLowerCase())) {
        words.pop();
    }

    return words.length > 0 ? words.join(" ") : undefined;

}

// Strips trailing punctuation (commas, dashes, semicolons -- but not
// a sentence-ending . ! ?) so a fragment is safe to concatenate
// further text onto without producing "...,." or "...--.".
export function stripTrailingPunctuation(
    text: string
): string {

    return text.replace(/[,;\-–—\s]+$/, "").trim();

}

const COMMON_SENTENCE_STARTERS = new Set([
    "the", "a", "an", "this", "that", "these", "those", "his", "her", "its", "their"
]);

// Lowercases the first letter UNLESS it looks like a proper noun
// (capitalized word that isn't a common article/determiner) --
// avoids both "The sprite's light..." mid-sentence AND "fiona the
// firefly" (a real name wrongly lowercased).
export function lowerFirstSafely(
    text: string
): string {

    if (text.length === 0) {
        return text;
    }

    const words = text.split(/\s+/);

    const firstWordIsCommon = COMMON_SENTENCE_STARTERS.has(words[0].toLowerCase());

    const looksLikeAName = !firstWordIsCommon && /^[A-Z][a-z]*$/.test(words[0]);

    if (looksLikeAName) {
        return text;
    }

    return text[0].toLowerCase() + text.slice(1);

}

const DETERMINERS = new Set([
    "a", "an", "the", "this", "that", "these", "those",
    "his", "her", "its", "their", "my", "your", "our"
]);

// Bounded, defensible rule -- not general grammar correction. Gemini
// sometimes drops the leading article entirely ("fallen log blocks
// stream" instead of "a fallen log blocks the stream"), which reads
// like a telegram, not a children's story. If the fragment doesn't
// already start with a determiner, prepend "the" -- this can never
// make grammar worse (a missing article is strictly more broken than
// an extra "the"), and never applies when one is already present.
function ensureLeadingArticle(
    text: string
): string {

    const firstWord = text.split(/\s+/)[0];

    if (!firstWord) {
        return text;
    }

    if (DETERMINERS.has(firstWord.toLowerCase())) {
        return text;
    }

    // A capitalized first word here means lowerFirstSafely already
    // identified it as a proper noun and deliberately left it alone
    // -- names don't take articles ("the Fiona" is wrong).
    if (/^[A-Z]/.test(firstWord)) {
        return text;
    }

    return `the ${text}`;

}

// The single safe way to build "{prefix} — {fragment}": truncates
// AND cleans the fragment, strips any trailing punctuation so the
// dash construction can never end in a dangling connector or stray
// comma, ensures a leading article, and lowercases correctly.
// Returns undefined if nothing usable remains after cleaning (caller
// should fall back to a simpler phrase, never emit a broken dash
// construction).
export function safeDashFragment(
    text: string | undefined,
    maxWords: number = 6
): string | undefined {

    const shortened = shortenSafely(text, maxWords);

    if (!shortened) {
        return undefined;
    }

    const cleaned = stripTrailingPunctuation(shortened);

    if (cleaned.length === 0) {
        return undefined;
    }

    return ensureLeadingArticle(lowerFirstSafely(cleaned));

}
