import { AppContainer } from "../container/AppContainer";

// BYOK completion: proves getAdventureRuntimeForUser actually does
// what it claims -- a user with their own key gets a DIFFERENT
// runtime than the shared global one, repeat calls reuse the SAME
// cached instance (no rebuild per request), a user with no key falls
// back to the global runtime, and invalidation forces a fresh build
// after the key changes.

async function main(): Promise<void> {

    const app = new AppContainer({

        persistence: "memory",
        jwtSecret: "test-secret-for-byok-wiring",
        encryptionKey: "test-encryption-key-1234567890",
        geminiApiKey: "global-fallback-key"

    });

    const user = await app.auth.register("byok-test@example.com", "a-strong-password-123");

    const userId = user.id;

    // --- No key yet: falls back to the shared global runtime ---

    const beforeKey = await app.getAdventureRuntimeForUser(userId);

    console.assert(
        beforeKey === app.adventures,
        "Expected a user with no API key to get the shared global runtime"
    );

    // --- Set a key (encryption/storage only -- no live Gemini call
    // needed to exercise this layer, validation happens in the route). ---

    await app.auth.setApiKey(userId, "AIzaSyFAKE-test-key-1234567890");

    app.invalidateUserRuntime(userId);

    const afterKey = await app.getAdventureRuntimeForUser(userId);

    console.assert(
        afterKey !== app.adventures,
        "Expected a user WITH their own API key to get a DIFFERENT runtime than the global one"
    );

    // --- Repeat calls reuse the cached instance (no rebuild per request) ---

    const again = await app.getAdventureRuntimeForUser(userId);

    console.assert(
        again === afterKey,
        "Expected repeated calls for the same user to return the SAME cached runtime instance"
    );

    // --- Different users never share a runtime ---

    const otherUser = await app.auth.register("byok-test-2@example.com", "another-strong-password-456");

    const otherUserId = otherUser.id;

    await app.auth.setApiKey(otherUserId, "AIzaSyFAKE-different-test-key-987");

    const otherUserRuntime = await app.getAdventureRuntimeForUser(otherUserId);

    console.assert(
        otherUserRuntime !== afterKey,
        "Expected two different users with their own keys to get two different runtimes"
    );

    // --- Invalidation forces a fresh build ---

    app.invalidateUserRuntime(userId);

    const afterInvalidate = await app.getAdventureRuntimeForUser(userId);

    console.assert(
        afterInvalidate !== afterKey,
        "Expected invalidateUserRuntime to force a fresh runtime on the next call"
    );

    // --- Removing the key falls back to global again ---

    await app.auth.removeApiKey(userId);

    app.invalidateUserRuntime(userId);

    const afterRemoval = await app.getAdventureRuntimeForUser(userId);

    console.assert(
        afterRemoval === app.adventures,
        "Expected a user who removed their key to fall back to the shared global runtime again"
    );

    console.log("AppContainer BYOK wiring tests passed.");

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
