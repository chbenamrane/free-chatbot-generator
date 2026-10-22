// Adds, replaces and removes the knowledge of a chatbot. Every change bumps "knowledgeVersion",
// which invalidates the cached answers of that chatbot.

import "server-only";
import { db } from "@/lib/db";
import { chunkText, MAX_SOURCE_CHARS } from "./chunk";

export const SOURCE_TYPES = ["text", "faq", "url", "file"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

const MAX_SOURCES_PER_BOT = 500;

export type SourceInput = { type: SourceType; title: string; content: string; url?: string | null; origin?: "admin" | "improvement" };

export class KnowledgeError extends Error {}

// A Q&A pair is stored as "question\n\nanswer" and indexed as a single chunk when it is short.
function chunksFor(type: SourceType, content: string): string[] {
  if (type === "faq") {
    const [question, ...rest] = content.split(/\n\s*\n/);
    const answer = rest.join("\n\n").trim();
    const joined = `Question: ${question.trim()}\nAnswer: ${answer}`;
    return joined.length <= 3000 ? [joined] : chunkText(joined, 900);
  }
  return chunkText(content);
}

export function faqContent(question: string, answer: string) {
  return `${question.trim()}\n\n${answer.trim()}`;
}

export async function addSource(botId: string, input: SourceInput): Promise<{ id: string; chunkCount: number }> {
  const content = input.content.trim();
  if (!content) throw new KnowledgeError("There is no text to learn.");
  if (content.length > MAX_SOURCE_CHARS) throw new KnowledgeError(`The text is too long (${MAX_SOURCE_CHARS.toLocaleString("en")} characters maximum).`);
  if ((await db.knowledgeSource.count({ where: { botId } })) >= MAX_SOURCES_PER_BOT) throw new KnowledgeError("This chatbot reached the limit of 500 sources.");

  const chunks = chunksFor(input.type, content);
  return db.$transaction(async (tx) => {
    const source = await tx.knowledgeSource.create({
      data: { botId, type: input.type, origin: input.origin ?? "admin", title: input.title.trim().slice(0, 200) || "Untitled", content, url: input.url ?? null, chunkCount: chunks.length },
    });
    await tx.knowledgeChunk.createMany({ data: chunks.map((text, position) => ({ sourceId: source.id, botId, position, content: text })) });
    await tx.bot.update({ where: { id: botId }, data: { knowledgeVersion: { increment: 1 } } });
    return { id: source.id, chunkCount: chunks.length };
  });
}

// Replaces the text of a source (edit, or re-import of a web page) and re-indexes it.
export async function replaceSource(botId: string, sourceId: string, input: { title?: string; content: string }) {
  const source = await db.knowledgeSource.findFirst({ where: { id: sourceId, botId } });
  if (!source) throw new KnowledgeError("This source no longer exists.");
  const content = input.content.trim();
  if (!content) throw new KnowledgeError("There is no text to learn.");
  if (content.length > MAX_SOURCE_CHARS) throw new KnowledgeError(`The text is too long (${MAX_SOURCE_CHARS.toLocaleString("en")} characters maximum).`);

  const chunks = chunksFor(source.type as SourceType, content);
  await db.$transaction([
    db.knowledgeChunk.deleteMany({ where: { sourceId } }),
    db.knowledgeChunk.createMany({ data: chunks.map((text, position) => ({ sourceId, botId, position, content: text })) }),
    db.knowledgeSource.update({ where: { id: sourceId }, data: { content, chunkCount: chunks.length, ...(input.title ? { title: input.title.trim().slice(0, 200) } : {}) } }),
    db.bot.update({ where: { id: botId }, data: { knowledgeVersion: { increment: 1 } } }),
  ]);
}

export async function removeSource(botId: string, sourceId: string) {
  const { count } = await db.knowledgeSource.deleteMany({ where: { id: sourceId, botId } }); // chunks cascade
  if (count > 0) await db.bot.update({ where: { id: botId }, data: { knowledgeVersion: { increment: 1 } } });
}
