import { shortenSafely, stripTrailingPunctuation, lowerFirstSafely, safeDashFragment } from "../services/TextFragmentUtils";

function main(): void {

    // --- The exact reported bug: truncation must never leave a
    // dangling conjunction/stopword ---

    console.assert(
        shortenSafely("a berry basket is spilled and scattered everywhere", 6) === "a berry basket is spilled",
        `Expected truncation to drop the dangling "and", got '${shortenSafely("a berry basket is spilled and scattered everywhere", 6)}'`
    );

    console.assert(
        !shortenSafely("a berry basket is spilled and scattered everywhere", 6)?.endsWith("and"),
        "Expected the result to never end on a stopword"
    );

    // --- Short text under the limit passes through unchanged ---

    console.assert(
        shortenSafely("a fallen branch", 6) === "a fallen branch",
        "Expected short text to pass through unchanged"
    );

    // --- Trailing punctuation stripped ---

    console.assert(
        stripTrailingPunctuation("who saw everything,") === "who saw everything",
        `Expected trailing comma stripped, got '${stripTrailingPunctuation("who saw everything,")}'`
    );

    console.assert(
        stripTrailingPunctuation("a fallen branch —") === "a fallen branch",
        "Expected trailing dash stripped"
    );

    // --- lowerFirstSafely: names preserved, articles lowered ---

    console.assert(
        lowerFirstSafely("Fiona the firefly witnessed it") === "Fiona the firefly witnessed it",
        "Expected a real name to keep its capital letter"
    );

    console.assert(
        lowerFirstSafely("The sprite's light is fading") === "the sprite's light is fading",
        "Expected a leading article to be lowercased"
    );

    // --- safeDashFragment: the full pipeline, on the exact reported
    // sentence, must never produce a fragment ending in a dangling
    // conjunction or stray punctuation ---

    {

        const result = safeDashFragment("a berry basket is spilled and scattered everywhere across the path");

        console.assert(
            result !== undefined && !/(^|\s)(and|or|but|the|a|an|who|which|that|with|to|of|in|on|at)$/i.test(result),
            `Expected a clean fragment with no dangling stopword, got '${result}'`
        );

    }

    // --- Degenerate input: nothing usable survives cleaning ---

    console.assert(
        safeDashFragment("and the") === undefined,
        "Expected input that's entirely stopwords to return undefined, not an empty dangling fragment"
    );

    console.assert(
        safeDashFragment(undefined) === undefined,
        "Expected undefined input to return undefined"
    );

    // --- Real browser bug: missing articles read like a telegram
    // ("fallen log blocks stream" instead of "a fallen log blocks
    // the stream"). A missing leading article gets "the" prepended. ---

    console.assert(
        safeDashFragment("fallen log blocks stream") === "the fallen log blocks stream",
        `Expected a missing leading article to be repaired, got '${safeDashFragment("fallen log blocks stream")}'`
    );

    // Already has an article -- must not double up ("the the").
    console.assert(
        safeDashFragment("a fallen log blocks the stream", 8) === "a fallen log blocks the stream",
        `Expected text that already has an article to be left alone, got '${safeDashFragment("a fallen log blocks the stream", 8)}'`
    );

    // A name must never get "the" prepended ("the Fiona" is wrong).
    console.assert(
        safeDashFragment("Fiona witnessed the accident") === "Fiona witnessed the accident",
        `Expected a proper noun to never get an article prepended, got '${safeDashFragment("Fiona witnessed the accident")}'`
    );

    console.log("TextFragmentUtils tests passed.");

}

main();
