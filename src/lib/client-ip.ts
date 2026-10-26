// IP address of a visitor, for rate limiting. The forwarding headers are written by the visitor unless a proxy of yours
// overwrites them, so which one to trust is an explicit setting (TRUST_PROXY):
//   none        (default) trust nothing: returns null, callers fall back to a shared limit
//   cloudflare  cf-connecting-ip (the origin must only accept Cloudflare traffic)
//   xff         the LAST X-Forwarded-For entry, the one added by your own reverse proxy (nginx, Caddy...)

export type TrustProxy = "none" | "cloudflare" | "xff";

export function trustProxyMode(value = process.env.TRUST_PROXY): TrustProxy {
  const mode = value?.trim().toLowerCase();
  return mode === "cloudflare" || mode === "xff" ? mode : "none";
}

export function clientIpFrom(headers: Headers, mode: TrustProxy = trustProxyMode()): string | null {
  if (mode === "cloudflare") return headers.get("cf-connecting-ip")?.trim() || null;
  if (mode === "xff") return headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || null;
  return null;
}
