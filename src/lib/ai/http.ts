// Shared HTTP helpers for the provider adapters. No server-only import: the engine is unit-tested outside Next.js.

// Error whose message can be shown as is to the admin.
export class AiUserError extends Error {}

// HTTP error returned by a provider.
export class AiHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export async function ensureOk(response: Response) {
  if (response.ok) return response;
  let message = "";
  try {
    const data = (await response.json()) as { error?: { message?: string } | string; message?: string };
    message = (typeof data.error === "string" ? data.error : data.error?.message) ?? data.message ?? "";
  } catch {
    // response without JSON
  }
  const retryAfter = Number(response.headers.get("retry-after"));
  throw new AiHttpError(
    response.status,
    message.replace(/\s+/g, " ").trim().slice(0, 300),
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  );
}

export const FIRST_CHUNK_TIMEOUT_MS = 30_000; // a visitor does not wait longer for the start of an answer
export const TOTAL_TIMEOUT_MS = 90_000;

// Reads a Server-Sent Events response and yields the "data:" payloads (without the prefix).
export async function* sseData(response: Response): AsyncGenerator<string> {
  if (!response.body) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const part of response.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(part, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) yield trimmed.slice(5).trim();
    }
  }
}

// Aborts the request if no text arrives within FIRST_CHUNK_TIMEOUT_MS, and after TOTAL_TIMEOUT_MS overall.
export function chatTimeouts() {
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), FIRST_CHUNK_TIMEOUT_MS);
  return {
    signal: controller.signal,
    started() {
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);
    },
    stop: () => clearTimeout(timer),
  };
}
