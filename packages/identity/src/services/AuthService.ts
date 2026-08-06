import jwt from "jsonwebtoken";

import { User, AuthenticatedSession } from "../models/User";
import { UserRepository } from "../repositories/UserRepository";
import { PasswordHasher } from "./PasswordHasher";
import { ApiKeyEncryption } from "./ApiKeyEncryption";

export interface AuthServiceConfig {

    jwtSecret: string;

    // Defaults to 7 days.
    tokenTtlSeconds?: number;

}

interface AccessTokenPayload {

    sub: string;

}

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

// v2.0: sessions are JWTs, not an in-memory token map. verify() is
// now a pure signature/expiry check -- no server-side session state
// at all, so sessions survive a restart by construction (there's
// nothing to lose). The tradeoff, documented on logout() below, is
// that revoking a single token before it expires isn't possible
// without adding a persisted denylist, which this phase doesn't add.
export class AuthService {

    private readonly hasher = new PasswordHasher();

    constructor(
        private readonly users: UserRepository,
        private readonly config: AuthServiceConfig,
        // BYOK (Part 4): optional so existing callers/tests that
        // don't manage API keys are unaffected. Methods below throw
        // a clear error if called without it configured.
        private readonly apiKeyEncryption?: ApiKeyEncryption
    ) {}

    async register(
        email: string,
        password: string
    ): Promise<User> {

        const existing = await this.users.findByEmail(email);

        if (existing) {

            throw new Error(
                `An account already exists for ${email}.`
            );

        }

        const passwordHash = await this.hasher.hash(password);

        const user: User = {

            id: crypto.randomUUID(),

            email,

            passwordHash,

            createdAt: new Date().toISOString()

        };

        await this.users.save(user);

        return user;

    }

    async login(
        email: string,
        password: string
    ): Promise<AuthenticatedSession> {

        const user = await this.users.findByEmail(email);

        if (!user) {

            throw new Error("Invalid email or password.");

        }

        const valid = await this.hasher.verify(
            password,
            user.passwordHash
        );

        if (!valid) {

            throw new Error("Invalid email or password.");

        }

        const ttlSeconds =
            this.config.tokenTtlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;

        const payload: AccessTokenPayload = { sub: user.id };

        const token = jwt.sign(
            payload,
            this.config.jwtSecret,
            { expiresIn: ttlSeconds }
        );

        const expiresAt = new Date(
            Date.now() + ttlSeconds * 1000
        ).toISOString();

        return {

            token,

            userId: user.id,

            expiresAt

        };

    }

    async verify(
        token: string
    ): Promise<string | undefined> {

        try {

            const payload = jwt.verify(
                token,
                this.config.jwtSecret
            ) as AccessTokenPayload;

            return payload.sub;

        }
        catch {

            return undefined;

        }

    }

    async logout(
        _token: string
    ): Promise<void> {

        // JWTs are stateless by design: there is no server-side
        // session to delete, so this is intentionally a no-op. True
        // immediate revocation (e.g. "log out everywhere right now")
        // would require a persisted denylist keyed by token/jti,
        // which is a reasonable follow-up but isn't added here --
        // until then, issued tokens remain valid until they expire
        // (tokenTtlSeconds).
        return;

    }

    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {

        const user = await this.users.findById(userId);

        if (!user) {

            throw new Error("Account not found.");

        }

        const valid = await this.hasher.verify(
            currentPassword,
            user.passwordHash
        );

        if (!valid) {

            throw new Error("Current password is incorrect.");

        }

        if (newPassword.length < 8) {

            throw new Error("New password must be at least 8 characters.");

        }

        user.passwordHash = await this.hasher.hash(newPassword);

        await this.users.save(user);

    }

    // BYOK (Part 4). Validation of the key against the real Gemini
    // API happens in the route layer (it needs to make an actual
    // LLM call, which is outside AuthService's job) -- this method
    // only encrypts and persists an ALREADY-validated key.
    async setApiKey(
        userId: string,
        plaintextApiKey: string
    ): Promise<void> {

        if (!this.apiKeyEncryption) {

            throw new Error("AuthService: API key management is not configured (ENCRYPTION_KEY missing).");

        }

        const user = await this.users.findById(userId);

        if (!user) {
            throw new Error("Account not found.");
        }

        user.geminiApiKeyEncrypted = this.apiKeyEncryption.encrypt(plaintextApiKey);

        await this.users.save(user);

    }

    async removeApiKey(
        userId: string
    ): Promise<void> {

        const user = await this.users.findById(userId);

        if (!user) {
            throw new Error("Account not found.");
        }

        user.geminiApiKeyEncrypted = undefined;

        await this.users.save(user);

    }

    // Never exposed via an HTTP response -- only consumed internally
    // to construct a per-user LLM client for gameplay requests.
    async getDecryptedApiKey(
        userId: string
    ): Promise<string | undefined> {

        if (!this.apiKeyEncryption) {
            return undefined;
        }

        const user = await this.users.findById(userId);

        if (!user?.geminiApiKeyEncrypted) {
            return undefined;
        }

        return this.apiKeyEncryption.decrypt(user.geminiApiKeyEncrypted);

    }

    async hasApiKey(
        userId: string
    ): Promise<boolean> {

        const user = await this.users.findById(userId);

        return !!user?.geminiApiKeyEncrypted;

    }

}
