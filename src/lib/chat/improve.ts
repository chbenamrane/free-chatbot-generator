// Improvement loop: turns the admin's answer to an unanswered question into knowledge, and closes the matching messages.

import "server-only";
import { db } from "@/lib/db";
import { addSource, faqContent, KnowledgeError } from "@/lib/knowledge/ingest";
import { normalizeQuestion } from "./cache";

// Messages the chatbot could not answer (it said it did not know, or no AI provider was available).
export const needsAnswer = { OR: [{ unanswered: true }, { status: "busy" }], handled: false } as const;

// Saves "question + answer" as a Q&A of the chatbot and marks as handled the message and every identical pending question.
export async function teachAnswer(botId: string, logId: string, answer: string, question?: string): Promise<{ closed: number }> {
  const log = await db.chatLog.findFirst({ where: { id: logId, botId }, select: { id: true, question: true } });
  if (!log) throw new KnowledgeError("This message no longer exists.");
  const finalQuestion = (question ?? log.question).trim();
  const finalAnswer = answer.trim();
  if (!finalQuestion || !finalAnswer) throw new KnowledgeError("Write the answer.");
  if (finalAnswer.length > 5000) throw new KnowledgeError("The answer is too long (5000 characters maximum).");

  await addSource(botId, { type: "faq", origin: "improvement", title: finalQuestion.slice(0, 120), content: faqContent(finalQuestion, finalAnswer) });

  // Close this message and the identical pending ones (same question after normalization).
  const key = normalizeQuestion(log.question);
  const pending = await db.chatLog.findMany({
    where: { botId, handled: false, OR: [{ unanswered: true }, { status: "busy" }, { feedback: -1 }] },
    select: { id: true, question: true },
    take: 1000,
  });
  const ids = pending.filter((p) => normalizeQuestion(p.question) === key).map((p) => p.id);
  if (!ids.includes(log.id)) ids.push(log.id);
  const { count } = await db.chatLog.updateMany({ where: { id: { in: ids }, botId }, data: { handled: true } });
  return { closed: count };
}

export async function dismissMessage(botId: string, logId: string) {
  await db.chatLog.updateMany({ where: { id: logId, botId }, data: { handled: true } });
}
