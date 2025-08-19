import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string, secretKey: string) {
    const iv = randomBytes(16);
    const key = createHash("sha256").update(secretKey).digest();
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Pack iv + tag + encrypted into one buffer
    const payload = Buffer.concat([iv, tag, encrypted]);

    // Return as base64url (URL-safe)
    return payload.toString("base64url");
}

export function decrypt(encryptedString: string, secretKey: string) {
    const payload = Buffer.from(encryptedString, "base64url");
    const key = createHash("sha256").update(secretKey).digest();

    // Extract iv, tag, and ciphertext
    const iv = payload.subarray(0, 16);
    const tag = payload.subarray(16, 32);
    const encrypted = payload.subarray(32);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}