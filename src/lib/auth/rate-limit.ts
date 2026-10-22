// Sign-in attempt limiting (against brute-force attacks).
// Recent failures are counted per e-mail AND per IP address, in the database.

import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000; // 15-minute window
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

export async function getClientIp() {
  const h = await headers();
  // Behind Cloudflare "cf-connecting-ip" is reliable. Otherwise take the LAST x-forwarded-for entry:
  // it is the one added by your own reverse proxy (nginx, Caddy...). Earlier entries are written by the
  // visitor and can be forged. These headers are only trustworthy behind your own proxy.
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
}

const emailKey = (email: string) => `email:${email}`;
const ipKey = (ip: string) => `ip:${ip}`;

export async function isBlocked(email: string, ip: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { key: emailKey(email), createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { key: ipKey(ip), createdAt: { gte: since } } }),
  ]);
  return byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP;
}

export async function recordFailure(email: string, ip: string) {
  await db.loginAttempt.createMany({ data: [{ key: emailKey(email) }, { key: ipKey(ip) }] });
}

export async function clearFailures(email: string) {
  await db.loginAttempt.deleteMany({ where: { key: emailKey(email) } });
  // Housekeeping: delete old rows that no longer count.
  await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - WINDOW_MS) } } });
}
