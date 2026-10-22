// Integration test of the improvement loop (skipped without DATABASE_URL).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const enabled = Boolean(process.env.DATABASE_URL);
let botId = "";
let db: typeof import("../src/lib/db").db;
let improve: typeof import("../src/lib/chat/improve");
let search: typeof import("../src/lib/knowledge/search");

before(async () => {
  if (!enabled) return;
  ({ db } = await import("../src/lib/db"));
  improve = await import("../src/lib/chat/improve");
  search = await import("../src/lib/knowledge/search");
  botId = (await db.bot.create({ data: { name: "zz-test", slug: `zz-test-${Date.now()}`, publicKey: `pk_zz${Date.now()}`, languages: ["en"], allowedOrigins: [] } })).id;
});

after(async () => {
  if (!enabled) return;
  await db.bot.deleteMany({ where: { id: botId } });
  await db.$disconnect();
});

test("teaching an answer saves a Q&A and closes identical pending questions", { skip: !enabled }, async () => {
  const mk = (question: string, extra: object = {}) => db.chatLog.create({ data: { botId, question, unanswered: true, ...extra } });
  const a = await mk("Do you ship to Canada?");
  const b = await mk("do you SHIP to canada");
  const other = await mk("What is your phone number?");
  const busy = await db.chatLog.create({ data: { botId, question: "Is it open?", status: "busy" } });

  assert.equal(await db.chatLog.count({ where: { botId, ...improve.needsAnswer } }), 4, "unanswered and failed messages both need an answer");

  const before = (await db.bot.findUniqueOrThrow({ where: { id: botId } })).knowledgeVersion;
  const result = await improve.teachAnswer(botId, a.id, "Yes, we ship to Canada in 7 days.");
  assert.equal(result.closed, 2);

  const handled = await db.chatLog.findMany({ where: { botId, handled: true }, select: { id: true } });
  assert.deepEqual(handled.map((h) => h.id).sort(), [a.id, b.id].sort());
  assert.equal((await db.chatLog.findUniqueOrThrow({ where: { id: other.id } })).handled, false);

  const source = await db.knowledgeSource.findFirstOrThrow({ where: { botId } });
  assert.equal(source.type, "faq");
  assert.equal(source.origin, "improvement");
  assert.ok((await db.bot.findUniqueOrThrow({ where: { id: botId } })).knowledgeVersion > before, "cached answers are invalidated");

  const found = await search.retrieveKnowledge(botId, "can you ship to Canada?");
  assert.ok(found.hits.some((h) => h.content.includes("7 days")));

  await improve.dismissMessage(botId, other.id);
  assert.equal(await db.chatLog.count({ where: { botId, ...improve.needsAnswer } }), 1, "only the failed message is left");
  void busy;
});

test("refuses empty answers and unknown messages", { skip: !enabled }, async () => {
  const log = await db.chatLog.create({ data: { botId, question: "Anything?", unanswered: true } });
  await assert.rejects(improve.teachAnswer(botId, log.id, "   "), /Write the answer/);
  await assert.rejects(improve.teachAnswer(botId, "nope", "x"), /no longer exists/);
  await assert.rejects(improve.teachAnswer("other-bot", log.id, "x"), /no longer exists/, "a message of another chatbot cannot be used");
});
