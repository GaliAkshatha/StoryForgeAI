// Identity is intentionally minimal: StoryForge only authenticates
// Parents. Children never log in themselves -- they're managed
// profiles under a parent's account (see the Parent domain).
export interface User {

    id: string;

    email: string;

    // bcrypt hashes embed their own salt and cost factor in the hash
    // string itself, so there is no separate passwordSalt field (v1
    // used Node's scrypt, which required one).
    passwordHash: string;

    // BYOK (Part 4): AES-256-GCM encrypted, never the plaintext key.
    // Absent means the user hasn't connected their own key yet.
    geminiApiKeyEncrypted?: string;

    createdAt: string;

}

export interface AuthenticatedSession {

    token: string;

    userId: string;

    expiresAt: string;

}
