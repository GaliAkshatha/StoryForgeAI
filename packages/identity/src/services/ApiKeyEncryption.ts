import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// BYOK (Part 4): encrypts a user's Gemini API key before it's ever
// persisted. AES-256-GCM -- authenticated encryption, so tampering
// with the stored ciphertext is detected on decrypt, not silently
// accepted. The server-side secret (ENCRYPTION_KEY) never leaves the
// backend; the plaintext key is decrypted only in memory, per
// request, and is never sent back to the frontend once saved.
const ALGORITHM = "aes-256-gcm";

function deriveKey(secret: string): Buffer {

    return scryptSync(secret, "storyforge-api-key-encryption", 32);

}

export class ApiKeyEncryption {

    constructor(
        private readonly secret: string
    ) {

        if (!secret || secret.length < 16) {

            throw new Error(
                "ApiKeyEncryption: ENCRYPTION_KEY must be set to a strong secret (16+ chars)."
            );

        }

    }

    encrypt(
        plaintext: string
    ): string {

        const key = deriveKey(this.secret);

        const iv = randomBytes(12);

        const cipher = createCipheriv(ALGORITHM, key, iv);

        const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

        const authTag = cipher.getAuthTag();

        return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");

    }

    decrypt(
        stored: string
    ): string {

        const [ivB64, authTagB64, cipherTextB64] = stored.split(":");

        if (!ivB64 || !authTagB64 || !cipherTextB64) {

            throw new Error("ApiKeyEncryption: malformed stored value.");

        }

        const key = deriveKey(this.secret);

        const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));

        decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(cipherTextB64, "base64")),
            decipher.final()
        ]);

        return decrypted.toString("utf8");

    }

}
