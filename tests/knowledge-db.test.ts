// Integration test of the knowledge pipeline against a real PostgreSQL database (skipped without DATABASE_URL).
// It only creates and deletes its own temporary chatbot.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const enabled = Boolean(process.env.DATABASE_URL);

let botId = "";
let db: typeof import("../src/lib/db").db;
let ingest: typeof import("../src/lib/knowledge/ingest");
let search: typeof import("../src/lib/knowledge/search");

before(async () => {
  if (!enabled) return;
  ({ db } = await import("../src/lib/db"));
  ingest = await import("../src/lib/knowledge/ingest");
  search = await import("../src/lib/knowledge/search");
  const bot = await db.bot.create({
    data: { name: "zz-test", slug: `zz-test-${Date.now()}`, publicKey: `pk_zz${Date.now()}`, languages: ["en"], allowedOrigins: [] },
  });
  botId = bot.id;
});

after(async () => {
  if (!enabled) return;
  await db.bot.deleteMany({ where: { id: botId } });
  await db.$disconnect();
});

test("small knowledge is sent in full", { skip: !enabled }, async () => {
  assert.equal((await search.retrieveKnowledge(botId, "anything")).mode, "none");
  await ingest.addSource(botId, { type: "text", title: "Hours", content: "We are open from 9 to 5, Monday to Friday." });
  const r = await search.retrieveKnowledge(botId, "when are you open?");
  assert.equal(r.mode, "all");
  assert.equal(r.hits.length, 1);
  assert.ok(r.hits[0].content.includes("9 to 5"));
});

test("large knowledge is searched with full-text search and favours Q&As", { skip: !enabled }, async () => {
  const filler = Array.from({ length: 120 }, (_, i) => `Paragraph ${i} talks about gardening, tomatoes and compost for plants.`).join("\n\n");
  await ingest.addSource(botId, { type: "text", title: "Garden", content: filler });
  await ingest.addSource(botId, { type: "faq", title: "Refunds", content: ingest.faqContent("Do you offer refunds?", "Yes, within 30 days of purchase.") });
  await ingest.addSource(botId, { type: "text", title: "Shipping", content: "Delivery takes 3 to 5 working days anywhere in France." });

  const refunds = await search.retrieveKnowledge(botId, "can I get a refund");
  assert.equal(refunds.mode, "search");
  assert.ok(refunds.hits.length > 0 && refunds.hits[0].title === "Refunds", JSON.stringify(refunds.hits.map((h) => h.title)));

  const shipping = await search.retrieveKnowledge(botId, "how long does delivery take?");
  assert.equal(shipping.hits[0]?.title, "Shipping");

  const nothing = await search.retrieveKnowledge(botId, "quantum chromodynamics");
  assert.equal(nothing.hits.length, 0);

  // SQL injection attempts are harmless
  await search.retrieveKnowledge(botId, "x'); DROP TABLE \"KnowledgeChunk\"; --");
  assert.ok((await db.knowledgeChunk.count({ where: { botId } })) > 0);
});

test("editing and deleting a source updates the index and bumps the version", { skip: !enabled }, async () => {
  const before = (await db.bot.findUniqueOrThrow({ where: { id: botId } })).knowledgeVersion;
  const source = await db.knowledgeSource.findFirstOrThrow({ where: { botId, title: "Shipping" } });
  await ingest.replaceSource(botId, source.id, { content: "Delivery now takes 1 day." });
  assert.ok((await search.retrieveKnowledge(botId, "delivery")).hits.some((h) => h.content.includes("1 day")));
  await ingest.removeSource(botId, source.id);
  assert.ok(!(await search.retrieveKnowledge(botId, "delivery")).hits.some((h) => h.title === "Shipping"));
  assert.ok((await db.bot.findUniqueOrThrow({ where: { id: botId } })).knowledgeVersion >= before + 2);
});

test("empty and oversized content is refused", { skip: !enabled }, async () => {
  await assert.rejects(ingest.addSource(botId, { type: "text", title: "x", content: "   " }), ingest.KnowledgeError);
  await assert.rejects(ingest.addSource(botId, { type: "text", title: "x", content: "a".repeat(200_001) }), ingest.KnowledgeError);
});
