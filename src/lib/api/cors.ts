// Origin checks and CORS headers for the public API. Pure functions (no server-only import).

// A browser always sends the Origin header on cross-site requests. An empty list of allowed origins means "any website".
// The instance's own origin is always allowed (the admin previews the widget from there).
export function isOriginAllowed(origin: string | null, allowedOrigins: string[], selfOrigin: string | null): boolean {
  if (!origin) return true; // not a browser (server, curl): the origin rule only protects browser use of the public key
  if (selfOrigin && origin === selfOrigin) return true;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

export function selfOriginFrom(headers: Headers, appUrl: string | undefined): string | null {
  if (appUrl) {
    try {
      return new URL(appUrl).origin;
    } catch {
      // invalid APP_URL: fall back to the request headers
    }
  }
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return null;
  const proto = headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

const ALLOW_HEADERS = "Content-Type, Authorization, X-Bot-Key";

// Headers for the real response: the origin is echoed only when it is allowed.
export function corsHeaders(origin: string | null, allowed: boolean, methods: string): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = methods;
    headers["Access-Control-Allow-Headers"] = ALLOW_HEADERS;
  }
  return headers;
}

// Preflight answer. A preflight request cannot carry the bot key, so the origin is echoed here and the real
// request (which has the key) is the one that enforces the allowed origins.
export function preflightHeaders(origin: string | null, methods: string): Record<string, string> {
  return {
    Vary: "Origin",
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Max-Age": "86400",
  };
}
