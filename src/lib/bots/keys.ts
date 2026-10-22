// Chatbot API keys.
//   public key  "pk_..." : identifies the bot in the widget; safe to put in a web page (restricted by allowed origins).
//   secret key  "sk_..." : for server-to-server calls; only its SHA-256 hash is stored.

import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const generatePublicKey = () => `pk_${randomBytes(18).toString("base64url")}`;

export function generateSecretKey() {
  const key = `sk_${randomBytes(32).toString("base64url")}`;
  return { key, hash: hashSecretKey(key), hint: key.slice(-4) };
}

export const hashSecretKey = (key: string) => createHash("sha256").update(key).digest("hex");
