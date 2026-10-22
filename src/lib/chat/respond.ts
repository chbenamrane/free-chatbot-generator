// One chatbot answer, end to end: retrieve the relevant knowledge, build the prompt, run the provider chain
// (with fallback) and strip the "no answer" marker from the text. Used by the public API and the admin playground.

import "server-only";
import type { Provider } from "@/lib/ai/catalog";
import { runBotChat } from "@/lib/ai/bot-chain";
import type { ChatTurn } from "@/lib/ai/types";
import { retrieveKnowledge } from "@/lib/knowledge/search";
import { stripMarker, type MarkerState } from "./marker";
import { buildSystemPrompt } from "./prompt";

type ResponderBot = { id: string; name: string; languages: string[]; instructions: string };

export const MAX_HISTORY_TURNS = 8;

export type BotAnswer =
  | { ok: true; provider: Provider; model: string; fallback: boolean; stream: AsyncGenerator<string>; state: MarkerState; knowledgeHits: number }
  | { ok: false; error: string };

export async function answerQuestion(bot: ResponderBot, question: string, history: ChatTurn[] = [], visitor: { name?: string } = {}): Promise<BotAnswer> {
  const retrieval = await retrieveKnowledge(bot.id, question);
  const system = buildSystemPrompt(bot, retrieval.hits.map((h) => `[${h.title}]\n${h.content}`), visitor);
  const turns: ChatTurn[] = [...history.slice(-MAX_HISTORY_TURNS), { role: "user", content: question }];

  const run = await runBotChat(bot.id, system, turns);
  if (!run.ok) return { ok: false, error: run.error };

  const state: MarkerState = { unanswered: false };
  return { ok: true, provider: run.provider, model: run.model, fallback: run.fallback, stream: stripMarker(run.stream, state), state, knowledgeHits: retrieval.hits.length };
}
