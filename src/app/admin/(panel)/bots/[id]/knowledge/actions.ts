"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { htmlToText } from "@/lib/knowledge/html";
import { fetchPage, FetchPageError } from "@/lib/knowledge/fetch-url";
import { addSource, faqContent, KnowledgeError, removeSource, replaceSource, type SourceInput } from "@/lib/knowledge/ingest";
import { retrieveKnowledge, type KnowledgeHit } from "@/lib/knowledge/search";

export type KnowledgeState = { ok?: boolean; error?: string; message?: string } | undefined;
export type SearchState = { error?: string; mode?: string; hits?: Pick<KnowledgeHit, "id" | "title" | "content" | "rank">[]; query?: string } | undefined;

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "");

async function guard(formData: FormData) {
  await requireAdmin();
  const botId = str(formData, "botId");
  if (!(await db.bot.findUnique({ where: { id: botId }, select: { id: true } }))) throw new KnowledgeError("This chatbot no longer exists.");
  return botId;
}

// Runs an action body and turns the expected errors into a message for the form.
async function run(formData: FormData, body: (botId: string) => Promise<string>): Promise<KnowledgeState> {
  try {
    const botId = await guard(formData);
    const message = await body(botId);
    revalidatePath(`/admin/bots/${botId}/knowledge`);
    return { ok: true, message };
  } catch (error) {
    if (error instanceof KnowledgeError || error instanceof FetchPageError) return { error: error.message };
    throw error;
  }
}

const added = (kind: string, chunks: number) => `${kind} learned (${chunks} piece${chunks === 1 ? "" : "s"}).`;

export async function addTextAction(_prev: KnowledgeState, formData: FormData) {
  return run(formData, async (botId) => {
    const r = await addSource(botId, { type: "text", title: str(formData, "title") || "Text", content: str(formData, "content") });
    return added("Text", r.chunkCount);
  });
}

export async function addFaqAction(_prev: KnowledgeState, formData: FormData) {
  return run(formData, async (botId) => {
    const question = str(formData, "question").trim();
    const answer = str(formData, "answer").trim();
    if (!question || !answer) throw new KnowledgeError("Write both the question and its answer.");
    const r = await addSource(botId, { type: "faq", title: question.slice(0, 120), content: faqContent(question, answer) });
    return added("Q&A", r.chunkCount);
  });
}

export async function addUrlAction(_prev: KnowledgeState, formData: FormData) {
  return run(formData, async (botId) => {
    const page = await fetchPage(str(formData, "url"));
    if (page.text.length < 20) throw new KnowledgeError("No readable text was found on this page (it may be rendered by JavaScript).");
    const r = await addSource(botId, { type: "url", title: page.title, content: page.text, url: page.url });
    return added("Page", r.chunkCount);
  });
}

const FILE_EXTENSIONS = [".txt", ".md", ".markdown", ".csv", ".json", ".html", ".htm"];

export async function addFileAction(_prev: KnowledgeState, formData: FormData) {
  return run(formData, async (botId) => {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new KnowledgeError("Choose a file.");
    if (file.size > 1_000_000) throw new KnowledgeError("The file is too large (1 MB maximum).");
    const name = file.name.toLowerCase();
    if (!FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) throw new KnowledgeError(`Supported files: ${FILE_EXTENSIONS.join(", ")}`);

    let text = await file.text();
    if (name.endsWith(".html") || name.endsWith(".htm")) text = htmlToText(text).text;
    const input: SourceInput = { type: "file", title: file.name, content: text };
    const r = await addSource(botId, input);
    return added("File", r.chunkCount);
  });
}

export async function updateSourceAction(_prev: KnowledgeState, formData: FormData) {
  return run(formData, async (botId) => {
    const sourceId = str(formData, "sourceId");
    const source = await db.knowledgeSource.findFirst({ where: { id: sourceId, botId }, select: { type: true } });
    if (!source) throw new KnowledgeError("This source no longer exists.");
    if (source.type === "faq") {
      const question = str(formData, "question").trim();
      const answer = str(formData, "answer").trim();
      if (!question || !answer) throw new KnowledgeError("Write both the question and its answer.");
      await replaceSource(botId, sourceId, { title: question.slice(0, 120), content: faqContent(question, answer) });
    } else {
      await replaceSource(botId, sourceId, { title: str(formData, "title"), content: str(formData, "content") });
    }
    return "Saved.";
  });
}

export async function refreshUrlAction(formData: FormData): Promise<KnowledgeState> {
  return run(formData, async (botId) => {
    const sourceId = str(formData, "sourceId");
    const source = await db.knowledgeSource.findFirst({ where: { id: sourceId, botId, type: "url" } });
    if (!source?.url) throw new KnowledgeError("This source has no address to refresh.");
    const page = await fetchPage(source.url);
    await replaceSource(botId, sourceId, { title: page.title, content: page.text });
    return "Page refreshed.";
  });
}

export async function deleteSourceAction(formData: FormData) {
  const botId = await guard(formData);
  await removeSource(botId, str(formData, "sourceId"));
  revalidatePath(`/admin/bots/${botId}/knowledge`);
}

// Shows what the chatbot would retrieve for a question (to check that its knowledge is findable).
export async function searchTestAction(_prev: SearchState, formData: FormData): Promise<SearchState> {
  await requireAdmin();
  const query = str(formData, "query").trim().slice(0, 300);
  if (!query) return { error: "Type a question." };
  const retrieval = await retrieveKnowledge(str(formData, "botId"), query);
  return { query, mode: retrieval.mode, hits: retrieval.hits.map((h) => ({ id: h.id, title: h.title, content: h.content, rank: h.rank })) };
}
