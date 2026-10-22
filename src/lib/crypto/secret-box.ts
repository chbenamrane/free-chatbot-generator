// Encryption of secrets stored in the database (AI provider API keys).
// AES-256-GCM: the text is encrypted AND protected against tampering. Without APP_SECRET
// (from the server's environment) a database dump does not reveal the keys.

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class SecretConfigError extends Error {}

function getKey() {
  const raw = process.env.APP_SECRET;
  if (!raw) throw new SecretConfigError("APP_SECRET is missing from the environment (.env).");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new SecretConfigError("APP_SECRET must be 32 bytes encoded in base64 (see .env.example).");
  return key;
}

// Result: "v1.<iv>.<auth tag>.<ciphertext>" (everything base64url).
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), encrypted].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

// Returns null when the text cannot be read (wrong secret, modified data) instead of throwing.
export function decryptSecret(token: string): string | null {
  try {
    const [version, iv, tag, data] = token.split(".");
    if (version !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof SecretConfigError) throw error;
    return null;
  }
}
