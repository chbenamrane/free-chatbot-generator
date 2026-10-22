// Request rate limiting, counted in the database so it works with several server processes.

import "server-only";
import { db } from "@/lib/db";

// Returns true when the request is allowed (and counts it), false when the limit is reached.
export async function takeRate(key: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  if ((await db.rateHit.count({ where: { key, createdAt: { gte: since } } })) >= limit) return false;
  await db.rateHit.create({ data: { key } });
  if (Math.random() < 0.01) await db.rateHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } }); // housekeeping
  return true;
}

export const RATE_PER_VISITOR = Number(process.env.CHAT_RATE_PER_MINUTE) || 15; // messages per minute, per visitor and chatbot
export const RATE_PER_BOT = Number(process.env.CHAT_BOT_RATE_PER_MINUTE) || 300; // messages per minute, per chatbot
