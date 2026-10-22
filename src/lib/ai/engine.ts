// Chat engine: tries the providers of a chatbot in order and falls back to the next one on failure.
// Pure logic (no database): the caller supplies the chain and is told about failures and successes.

import { anthropicListModels, anthropicStream, anthropicTest } from "./anthropic";
import { PROVIDER_INFO } from "./catalog";
import { describeAiError } from "./errors";
import { AiUserError } from "./http";
import { openAiListModels, openAiStream, openAiTest } from "./openai-compat";
import type { ActiveAi, ChatTurn } from "./types";

const streamWith = (ai: ActiveAi, system: string, history: ChatTurn[]) =>
  PROVIDER_INFO[ai.provider].protocol === "anthropic" ? anthropicStream(ai, system, history) : openAiStream(ai, system, history);

export const testWith = (ai: ActiveAi) => (PROVIDER_INFO[ai.provider].protocol === "anthropic" ? anthropicTest(ai) : openAiTest(ai));

export const listModelsWith = (ai: Pick<ActiveAi, "provider" | "apiKey" | "baseUrl">) =>
  PROVIDER_INFO[ai.provider].protocol === "anthropic" ? anthropicListModels(ai) : openAiListModels(ai);

export type ChainItem<T = unknown> = { ai: ActiveAi; ref: T };

export type ChatHooks<T> = {
  onFailure?: (item: ChainItem<T>, error: unknown) => void | Promise<void>;
  onSuccess?: (item: ChainItem<T>) => void | Promise<void>;
};

export type ChatStart =
  | { ok: true; provider: ActiveAi["provider"]; model: string; fallback: boolean; stream: AsyncGenerator<string> }
  | { ok: false; error: string };

// Starts the answer with the first provider that produces text. Switching to another provider is only possible
// before the first piece of text; a failure in the middle of the answer ends the stream with an error.
export async function startChat<T>(chain: ChainItem<T>[], system: string, history: ChatTurn[], hooks: ChatHooks<T> = {}): Promise<ChatStart> {
  if (chain.length === 0) return { ok: false, error: "No AI provider is available for this chatbot." };

  const errors: string[] = [];
  for (const [index, item] of chain.entries()) {
    const stream = streamWith(item.ai, system, history);
    try {
      const first = await stream.next();
      if (first.done) throw new AiUserError(`${PROVIDER_INFO[item.ai.provider].name} returned an empty answer.`);
      await hooks.onSuccess?.(item);
      return {
        ok: true,
        provider: item.ai.provider,
        model: item.ai.model,
        fallback: index > 0,
        stream: (async function* () {
          yield first.value;
          yield* stream;
        })(),
      };
    } catch (error) {
      await stream.return(undefined).catch(() => undefined);
      errors.push(describeAiError(error, item.ai.provider));
      await hooks.onFailure?.(item, error);
    }
  }
  return { ok: false, error: errors.join(" ") };
}

export async function collect(stream: AsyncGenerator<string>) {
  let text = "";
  for await (const piece of stream) text += piece;
  return text;
}
