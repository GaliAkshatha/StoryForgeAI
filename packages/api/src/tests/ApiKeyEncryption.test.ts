import { ApiKeyEncryption } from "../security/ApiKeyEncryption";

function main(): void {

    const enc = new ApiKeyEncryption("a-strong-test-secret-value-12345");

    const plaintext = "AIzaSyFAKE-EXAMPLE-KEY-1234567890";

    const stored = enc.encrypt(plaintext);

    console.assert(
        stored !== plaintext,
        "Expected the stored value to never equal the plaintext key"
    );

    console.assert(
        !stored.includes(plaintext),
        "Expected the plaintext key to never appear as a substring of the stored value"
    );

    const decrypted = enc.decrypt(stored);

    console.assert(
        decrypted === plaintext,
        `Expected decrypt(encrypt(x)) === x, got '${decrypted}'`
    );

    const storedAgain = enc.encrypt(plaintext);

    console.assert(
        stored !== storedAgain,
        "Expected two encryptions of the same plaintext to produce different ciphertext (random IV)"
    );

    console.assert(
        enc.decrypt(storedAgain) === plaintext,
        "Expected the second encryption to also decrypt correctly"
    );

    const tampered = stored.slice(0, -4) + "abcd";

    let threw = false;

    try {
        enc.decrypt(tampered);
    }
    catch {
        threw = true;
    }

    console.assert(threw, "Expected tampered ciphertext to fail decryption (GCM auth tag mismatch)");

    const wrongSecretEnc = new ApiKeyEncryption("a-completely-different-secret-99");

    let wrongSecretThrew = false;

    try {
        wrongSecretEnc.decrypt(stored);
    }
    catch {
        wrongSecretThrew = true;
    }

    console.assert(wrongSecretThrew, "Expected decryption with the wrong secret to fail");

    console.log("ApiKeyEncryption tests passed.");

}

main();
