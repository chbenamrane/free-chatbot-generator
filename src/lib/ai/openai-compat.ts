// Adapter for every provider that speaks the OpenAI chat-completions protocol
// (Gemini, Groq, OpenRouter, Cerebras, Mistral, OpenAI and custom endpoints).

import { AiUserError, chatTimeouts, ensureOk, sseData } from "./http";
import type { ActiveAi, ChatTurn } from "./types";

function request(ai: Pick<ActiveAi, "apiKey" | "baseUrl">, path: string, init: { body?: unknown; signal?: AbortSignal } = {}) {
  return fetch(`${ai.baseUrl.replace(/\/+$/, "")}${path}`, {
    method: init.body ? "POST" : "GET",
    headers: { ...(ai.apiKey ? { Authorization: `Bearer ${ai.apiKey}` } : {}), "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  }).then(ensureOk);
}

export async function* openAiStream(ai: ActiveAi, system: string, history: ChatTurn[]): AsyncGenerator<string> {
  const timeouts = chatTimeouts();
  try {
    const response = await request(ai, "/chat/completions", {
      signal: timeouts.signal,
      body: { model: ai.model, stream: true, temperature: 0.3, max_tokens: 1200, messages: [{ role: "system", content: system }, ...history] },
    });
    let started = false;
    for await (const payload of sseData(response)) {
      if (payload === "[DONE]") return;
      try {
        const text = (JSON.parse(payload) as { choices?: { delta?: { content?: string | null } }[] }).choices?.[0]?.delta?.content;
        if (text) {
          if (!started) {
            started = true;
            timeouts.started();
          }
          yield text;
        }
      } catch {
        // incomplete line or service message: ignored
      }
    }
  } finally {
    timeouts.stop();
  }
}

export async function openAiTest(ai: ActiveAi) {
  const response = await request(ai, "/chat/completions", {
    signal: AbortSignal.timeout(60_000),
    body: { model: ai.model, max_tokens: 50, messages: [{ role: "user", content: "Reply with the single word OK." }] },
  });
  const data = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
  if (!data.choices?.[0]?.message?.content) throw new AiUserError("The model answered without any text.");
}

export async function openAiListModels(ai: Pick<ActiveAi, "apiKey" | "baseUrl">) {
  const response = await request(ai, "/models", { signal: AbortSignal.timeout(30_000) });
  const data = (await response.json()) as { data?: { id?: string }[] };
  // Drop models that cannot write text (speech, transcription, vision-only, moderation, embeddings).
  const notForText = /whisper|orpheus|tts|speech|transcri|guard|safeguard|moderation|embed|rerank|image|vision|ocr|dall-e|davinci|babbage/i;
  return (data.data ?? [])
    .map((m) => (m.id ?? "").replace(/^models\//, "")) // Gemini prefixes ids with "models/"
    .filter((id) => id && !notForText.test(id))
    .sort();
}
