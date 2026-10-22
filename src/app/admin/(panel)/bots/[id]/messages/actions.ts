"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { dismissMessage, teachAnswer } from "@/lib/chat/improve";
import { KnowledgeError } from "@/lib/knowledge/ingest";

export type TeachState = { ok?: boolean; error?: string; message?: string } | undefined;

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function teachAction(_prev: TeachState, formData: FormData): Promise<TeachState> {
  await requireAdmin();
  const botId = str(formData, "botId");
  try {
    const { closed } = await teachAnswer(botId, str(formData, "logId"), str(formData, "answer"), str(formData, "question") || undefined);
    revalidatePath(`/admin/bots/${botId}`, "layout");
    return { ok: true, message: closed > 1 ? `Learned. ${closed} identical messages closed.` : "Learned." };
  } catch (error) {
    if (error instanceof KnowledgeError) return { error: error.message };
    throw error;
  }
}

export async function dismissAction(formData: FormData) {
  await requireAdmin();
  const botId = str(formData, "botId");
  await dismissMessage(botId, str(formData, "logId"));
  revalidatePath(`/admin/bots/${botId}`, "layout");
}
