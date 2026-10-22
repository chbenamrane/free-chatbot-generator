// Answer cache for the first question of a conversation (no AI call when the same question was already answered).

import { createHash } from "node:crypto";

// Same question written with different case, accents' spacing or punctuation hits the same entry.
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const cacheKey = (question: string) => createHash("sha256").update(normalizeQuestion(question)).digest("hex");

// Changes whenever something that shapes the answers changes: knowledge, name, instructions or languages.
export function contentVersion(bot: { knowledgeVersion: number; name: string; instructions: string; languages: string[] }): string {
  const settings = createHash("sha1").update(JSON.stringify([bot.name, bot.instructions, bot.languages])).digest("hex").slice(0, 10);
  return `${bot.knowledgeVersion}:${settings}`;
}
