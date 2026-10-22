// Readable error messages and the "pause" applied to a provider after a failure.

import { PROVIDER_INFO, type Provider } from "./catalog";
import { AiHttpError, AiUserError } from "./http";

// HTTP status of a provider error (0: no response, timeout or network failure).
export const errorStatus = (error: unknown): number => (error instanceof AiHttpError ? error.status : 0);

export function describeAiError(error: unknown, provider: Provider): string {
  if (error instanceof AiUserError) return error.message;
  const name = PROVIDER_INFO[provider].name;

  if (error instanceof AiHttpError) {
    const { status } = error;
    if (status === 401 || status === 403) return `${name} rejected the API key.`;
    if (status === 404) return `Model not found at ${name}. Check its name (use "List models").`;
    if (status === 429) return `${name} quota reached (requests or tokens per minute or per day).`;
    if (status === 413) return `Request too long for ${name} (token limit).`;
    if (status >= 500) return `${name} is temporarily unavailable.`;
    return error.message ? `${name} error (${status}): ${error.message}` : `${name} error (${status}).`;
  }

  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return `${name} took too long to answer.`;
  return `Could not reach ${name}.`;
}

// How long a provider is skipped after an error, so the next requests go straight to the next provider.
export function pauseSeconds(error: unknown): number {
  const status = errorStatus(error);
  if (status === 429) return Math.min(error instanceof AiHttpError && error.retryAfterSeconds ? error.retryAfterSeconds : 300, 3600);
  if (status === 401 || status === 403 || status === 404) return 900; // configuration problem: the admin has to fix it
  if (status === 413) return 0; // specific to this request, not to the provider
  return 30; // outage, timeout, network failure
}
