import bcrypt from "bcrypt";

export class PasswordHasher {

    // 12 rounds is the commonly recommended default as of 2025 --
    // strong enough to resist offline brute force while staying fast
    // enough for interactive login.
    private static readonly SALT_ROUNDS = 12;

    async hash(
        password: string
    ): Promise<string> {

        return bcrypt.hash(password, PasswordHasher.SALT_ROUNDS);

    }

    async verify(
        password: string,
        hash: string
    ): Promise<boolean> {

        return bcrypt.compare(password, hash);

    }

}
