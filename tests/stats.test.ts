// Integration test of the dashboard statistics (skipped without DATABASE_URL).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const enabled = Boolean(process.env.DATABASE_URL);
let botId = "";
let db: typeof import("../src/lib/db").db;
let stats: typeof import("../src/lib/stats");

before(async () => {
  if (!enabled) return;
  ({ db } = await import("../src/lib/db"));
  stats = await import("../src/lib/stats");
  botId = (await db.bot.create({ data: { name: "zz-test", slug: `zz-test-${Date.now()}`, publicKey: `pk_zz${Date.now()}`, languages: ["en"], allowedOrigins: [] } })).id;
  const log = (data: object) => db.chatLog.create({ data: { botId, question: "q", answer: "a", ...data } });
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  await log({ provider: "groq", model: "m1", visitorHash: "v1", latencyMs: 100 });
  await log({ provider: "groq", model: "m1", visitorHash: "v1", latencyMs: 300, fallback: true, feedback: 1 });
  await log({ provider: "gemini", model: "m2", visitorHash: "v2", latencyMs: 200, unanswered: true, feedback: -1 });
  await log({ cached: true, visitorHash: "v3" });
  await log({ status: "busy", visitorHash: "v3" });
  await log({ provider: "groq", model: "m1", createdAt: daysAgo(3), visitorHash: "v4", latencyMs: 100 });
  await log({ provider: "groq", model: "m1", createdAt: daysAgo(40), visitorHash: "v5" });
});

after(async () => {
  if (!enabled) return;
  await db.bot.deleteMany({ where: { id: botId } });
  await db.$disconnect();
});

test("computes the counters of a bot over a period", { skip: !enabled }, async () => {
  const s = await stats.getStats(7, botId);
  assert.equal(s.messages, 6, "the message from 40 days ago is outside the period");
  assert.equal(s.visitors, 4);
  assert.equal(s.unanswered, 1);
  assert.equal(s.failed, 1);
  assert.equal(s.answered, 4);
  assert.equal(s.cached, 1);
  assert.equal(s.aiCalls, 4);
  assert.equal(s.helpful, 1);
  assert.equal(s.notHelpful, 1);
  assert.equal(s.avgLatencyMs, Math.round((100 + 300 + 200 + 100) / 4), "cached and failed calls are excluded");
  assert.equal(s.pending, 2, "the unanswered and the failed message");
});

test("fills the daily series and splits usage by provider", { skip: !enabled }, async () => {
  const s = await stats.getStats(7, botId);
  assert.equal(s.perDay.length, 7);
  assert.equal(s.perDay.reduce((sum, d) => sum + d.count, 0), 6);
  assert.equal(s.perDay.at(-1)!.count, 5, "today");
  const groq = s.providers.find((p) => p.provider === "groq")!;
  assert.deepEqual({ count: groq.count, fallback: groq.fallback, today: groq.today }, { count: 3, fallback: 1, today: 2 });
  assert.equal(s.providers[0].provider, "groq", "sorted by usage");
  const month = await stats.getStats(90, botId);
  assert.equal(month.messages, 7);
});

test("latest messages respects the limit, and notices flag a chatbot without provider", { skip: !enabled }, async () => {
  assert.equal((await stats.getLatestMessages(3, botId)).length, 3);
  assert.equal((await stats.getLatestMessages(100, botId)).length, 7);
  const notices = await stats.getNotices();
  assert.ok(notices.some((n) => n.botId === botId && n.level === "error"));
});
