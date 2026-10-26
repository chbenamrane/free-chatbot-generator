// JSON helpers and the error type of the public API.

import { clientIpFrom } from "@/lib/client-ip";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}

export function errorResponse(error: ApiError, headers: Record<string, string> = {}) {
  return json(
    { error: { code: error.code, message: error.message } },
    error.status,
    error.retryAfterSeconds ? { ...headers, "Retry-After": String(error.retryAfterSeconds) } : headers,
  );
}

// Reads a JSON body with a size limit (the body of a chat message is tiny).
export async function readJson(request: Request, maxBytes = 50_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new ApiError(413, "payload_too_large", "The request body is too large.");
  const text = await request.text();
  if (text.length > maxBytes) throw new ApiError(413, "payload_too_large", "The request body is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "The request body must be valid JSON.");
  }
}

// IP address of the visitor, or null when no proxy is trusted (TRUST_PROXY, see docs/security.md).
export const clientIp = (headers: Headers) => clientIpFrom(headers);
