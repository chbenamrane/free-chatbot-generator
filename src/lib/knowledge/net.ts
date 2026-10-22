// Network safety for fetching web pages on behalf of the admin (protection against SSRF:
// a URL must not be able to reach the server's own network).

import { isIP } from "node:net";

// True for addresses that must never be fetched: loopback, private, link-local (cloud metadata), CGNAT, multicast, reserved.
export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff");
  }
  return true; // not an IP address at all: refuse
}

export function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}
