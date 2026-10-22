// Statistics of the dashboard, computed from the conversation log.

import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { needsAnswer } from "@/lib/chat/improve";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export type Stats = {
  days: Range;
  messages: number;
  visitors: number;
  answered: number; // messages the chatbot could answer
  unanswered: number;
  failed: number; // no provider could answer
  cached: number;
  aiCalls: number;
  helpful: number;
  notHelpful: number;
  avgLatencyMs: number | null;
  pending: number; // messages still waiting for the admin
  leads: number; // visitors who filled the information form in the period
  perDay: { date: string; count: number }[];
  providers: { provider: string; model: string; count: number; fallback: number; today: number }[];
};

const startOfDayUtc = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export async function getStats(days: Range, botId?: string): Promise<Stats> {
  const now = new Date();
  const since = new Date(startOfDayUtc(now).getTime() - (days - 1) * 86_400_000);
  const today = startOfDayUtc(now);
  const base: Prisma.ChatLogWhereInput = { createdAt: { gte: since }, ...(botId ? { botId } : {}) };
  const botFilter = botId ? { botId } : {};

  const [messages, unanswered, failed, cached, helpful, notHelpful, latency, pending, visitorRows, dayRows, providerRows, todayRows, leads] = await Promise.all([
    // (leads are counted last, see the end of the list)
    db.chatLog.count({ where: base }),
    db.chatLog.count({ where: { ...base, unanswered: true } }),
    db.chatLog.count({ where: { ...base, status: "busy" } }),
    db.chatLog.count({ where: { ...base, cached: true } }),
    db.chatLog.count({ where: { ...base, feedback: 1 } }),
    db.chatLog.count({ where: { ...base, feedback: -1 } }),
    db.chatLog.aggregate({ where: { ...base, cached: false, status: "ok" }, _avg: { latencyMs: true } }),
    db.chatLog.count({ where: { ...botFilter, ...needsAnswer } }),
    db.chatLog.groupBy({ by: ["visitorHash"], where: { ...base, visitorHash: { not: null } } }),
    db.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day, COUNT(*) AS count
      FROM "ChatLog"
      WHERE "createdAt" >= ${since} AND (${botId ?? null}::text IS NULL OR "botId" = ${botId ?? null})
      GROUP BY 1`,
    db.chatLog.groupBy({ by: ["provider", "model"], where: { ...base, provider: { not: null }, cached: false }, _count: { _all: true } }),
    db.chatLog.groupBy({ by: ["provider"], where: { ...botFilter, createdAt: { gte: today }, provider: { not: null }, cached: false }, _count: { _all: true } }),
    db.lead.count({ where: { createdAt: { gte: since }, ...botFilter } }),
  ]);

  const counts = new Map(dayRows.map((r) => [r.day, Number(r.count)]));
  const perDay = Array.from({ length: days }, (_, i) => {
    const date = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });

  const todayByProvider = new Map(todayRows.map((r) => [r.provider, r._count._all]));
  const fallbackRows = await db.chatLog.groupBy({ by: ["provider", "model"], where: { ...base, provider: { not: null }, cached: false, fallback: true }, _count: { _all: true } });
  const fallbackBy = new Map(fallbackRows.map((r) => [`${r.provider}|${r.model}`, r._count._all]));

  const providers = providerRows
    .map((r) => ({
      provider: r.provider ?? "",
      model: r.model ?? "",
      count: r._count._all,
      fallback: fallbackBy.get(`${r.provider}|${r.model}`) ?? 0,
      today: todayByProvider.get(r.provider) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    days,
    messages,
    visitors: visitorRows.length,
    answered: messages - unanswered - failed,
    unanswered,
    failed,
    cached,
    aiCalls: providers.reduce((sum, p) => sum + p.count, 0),
    helpful,
    notHelpful,
    avgLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
    pending,
    leads,
    perDay,
    providers,
  };
}

export async function getLatestMessages(limit: number, botId?: string) {
  return db.chatLog.findMany({
    where: botId ? { botId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { bot: { select: { id: true, name: true } } },
  });
}

// Configuration problems worth showing on the dashboard.
export type Notice = { botId: string; botName: string; level: "error" | "warn"; text: string };

export async function getNotices(): Promise<Notice[]> {
  const now = new Date();
  const bots = await db.bot.findMany({ include: { providers: true }, orderBy: { name: "asc" } });
  const notices: Notice[] = [];
  for (const bot of bots) {
    if (!bot.enabled) continue;
    const active = bot.providers.filter((p) => p.enabled);
    const usable = active.filter((p) => !p.pausedUntil || p.pausedUntil <= now);
    if (active.length === 0) notices.push({ botId: bot.id, botName: bot.name, level: "error", text: "has no active AI provider and cannot answer." });
    else if (usable.length === 0) notices.push({ botId: bot.id, botName: bot.name, level: "error", text: "has all its providers paused after errors (quota reached or key refused)." });
    else for (const p of active) if (p.lastError) notices.push({ botId: bot.id, botName: bot.name, level: "warn", text: `${p.provider}: ${p.lastError}` });
  }
  return notices;
}

// Messages in the period and messages waiting for the admin, per chatbot.
export async function getPerBotCounts(days: Range) {
  const since = new Date(startOfDayUtc(new Date()).getTime() - (days - 1) * 86_400_000);
  const [messages, pending] = await Promise.all([
    db.chatLog.groupBy({ by: ["botId"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    db.chatLog.groupBy({ by: ["botId"], where: needsAnswer, _count: { _all: true } }),
  ]);
  return {
    messages: new Map(messages.map((r) => [r.botId, r._count._all])),
    pending: new Map(pending.map((r) => [r.botId, r._count._all])),
  };
}
