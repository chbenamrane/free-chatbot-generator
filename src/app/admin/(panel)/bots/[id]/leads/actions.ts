"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { checkLeadFormInput } from "@/lib/bots/lead-form";

export type LeadFormState = { ok?: boolean; error?: string } | undefined;

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function saveLeadFormAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(str(formData, "form"));
  } catch {
    return { error: "Invalid form data." };
  }
  const checked = checkLeadFormInput(raw);
  if (!checked.ok) return { error: checked.message };

  const botId = str(formData, "botId");
  const { count } = await db.bot.updateMany({ where: { id: botId }, data: { collect: checked.form } });
  if (count === 0) return { error: "This chatbot no longer exists." };
  revalidatePath(`/admin/bots/${botId}/leads`);
  return { ok: true };
}

export async function deleteLeadAction(formData: FormData) {
  await requireAdmin();
  const botId = str(formData, "botId");
  await db.lead.deleteMany({ where: { id: str(formData, "leadId"), botId } });
  revalidatePath(`/admin/bots/${botId}/leads`);
}

// Deletes every lead of the chatbot (for example before a data clean-up).
export async function deleteAllLeadsAction(formData: FormData) {
  await requireAdmin();
  const botId = str(formData, "botId");
  await db.lead.deleteMany({ where: { botId } });
  revalidatePath(`/admin/bots/${botId}/leads`);
}
