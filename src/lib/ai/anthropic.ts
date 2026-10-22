// Adapter for the Anthropic Messages API.

import { AiUserError, chatTimeouts, ensureOk, sseData } from "./http";
import type { ActiveAi, ChatTurn } from "./types";

function request(ai: Pick<ActiveAi, "apiKey" | "baseUrl">, path: string, init: { body?: unknown; signal?: AbortSignal } = {}) {
  return fetch(`${ai.baseUrl.replace(/\/+$/, "")}${path}`, {
    method: init.body ? "POST" : "GET",
    headers: { "x-api-key": ai.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  }).then(ensureOk);
}

export async function* anthropicStream(ai: ActiveAi, system: string, history: ChatTurn[]): AsyncGenerator<string> {
  const timeouts = chatTimeouts();
  try {
    const response = await request(ai, "/messages", {
      signal: timeouts.signal,
      body: { model: ai.model, stream: true, temperature: 0.3, max_tokens: 1200, system, messages: history },
    });
    let started = false;
    for await (const payload of sseData(response)) {
      try {
        const event = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string } };
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
          if (!started) {
            started = true;
            timeouts.started();
          }
          yield event.delta.text;
        }
      } catch {
        // incomplete line or service message: ignored
      }
    }
  } finally {
    timeouts.stop();
  }
}

export async function anthropicTest(ai: ActiveAi) {
  const response = await request(ai, "/messages", {
    signal: AbortSignal.timeout(60_000),
    body: { model: ai.model, max_tokens: 50, messages: [{ role: "user", content: "Reply with the single word OK." }] },
  });
  const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
  if (!data.content?.some((block) => block.type === "text" && block.text)) throw new AiUserError("The model answered without any text.");
}

export async function anthropicListModels(ai: Pick<ActiveAi, "apiKey" | "baseUrl">) {
  const response = await request(ai, "/models?limit=100", { signal: AbortSignal.timeout(30_000) });
  const data = (await response.json()) as { data?: { id?: string }[] };
  return (data.data ?? []).map((m) => m.id ?? "").filter(Boolean).sort();
}
