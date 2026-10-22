// Loads the providers of a chatbot from the database and runs a chat through the fallback engine.
// Failures pause the provider (so the next requests skip it); a success clears the pause.

import "server-only";
import { db } from "@/lib/db";
import { SecretConfigError, decryptSecret } from "@/lib/crypto/secret-box";
import { PROVIDER_INFO, isProvider } from "./catalog";
import { describeAiError, pauseSeconds } from "./errors";
import { startChat, type ChainItem, type ChatStart } from "./engine";
import type { ChatTurn } from "./types";

// Providers that can answer right now: enabled, with a key (unless optional), not paused. Ordered by priority.
async function loadChain(botId: string): Promise<ChainItem<string>[]> {
  const rows = await db.botProvider.findMany({
    where: { botId, enabled: true, OR: [{ pausedUntil: null }, { pausedUntil: { lte: new Date() } }] },
    orderBy: { sortOrder: "asc" },
  });

  const chain: ChainItem<string>[] = [];
  for (const row of rows) {
    if (!isProvider(row.provider)) continue;
    const info = PROVIDER_INFO[row.provider];
    const apiKey = row.keyEnc ? decryptSecret(row.keyEnc) : "";
    if (apiKey === null || (!apiKey && !info.keyOptional)) continue; // unreadable or missing key
    const baseUrl = row.baseUrl || info.baseUrl;
    if (!baseUrl || !row.model) continue;
    chain.push({ ref: row.id, ai: { provider: row.provider, model: row.model, apiKey, baseUrl } });
  }
  return chain;
}

export type BotChatResult = ChatStart;

export async function runBotChat(botId: string, system: string, history: ChatTurn[]): Promise<BotChatResult> {
  let chain: ChainItem<string>[];
  try {
    chain = await loadChain(botId);
  } catch (error) {
    if (error instanceof SecretConfigError) return { ok: false, error: error.message };
    throw error;
  }
  if (chain.length === 0) return { ok: false, error: "No AI provider is available for this chatbot (none enabled, or all are paused)." };

  return startChat(chain, system, history, {
    onFailure: async (item, error) => {
      const seconds = pauseSeconds(error);
      await db.botProvider.update({
        where: { id: item.ref },
        data: { lastError: describeAiError(error, item.ai.provider), pausedUntil: seconds > 0 ? new Date(Date.now() + seconds * 1000) : null },
      });
    },
    onSuccess: async (item) => {
      await db.botProvider.updateMany({ where: { id: item.ref, OR: [{ pausedUntil: { not: null } }, { lastError: { not: null } }] }, data: { pausedUntil: null, lastError: null } });
    },
  });
}
