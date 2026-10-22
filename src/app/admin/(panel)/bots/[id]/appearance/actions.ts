"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { appearanceSchema } from "@/lib/bots/appearance";

export type AppearanceState = { ok?: boolean; error?: string } | undefined;

export async function saveAppearanceAction(_prev: AppearanceState, formData: FormData): Promise<AppearanceState> {
  await requireAdmin();
  const botId = String(formData.get("botId") ?? "");
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("appearance") ?? ""));
  } catch {
    return { error: "Invalid appearance data." };
  }
  // Invalid fields fall back to their defaults (see appearanceSchema), so the stored value is always usable.
  const appearance = appearanceSchema.parse(raw);
  const { count } = await db.bot.updateMany({ where: { id: botId }, data: { appearance } });
  if (count === 0) return { error: "This chatbot no longer exists." };
  revalidatePath(`/admin/bots/${botId}/appearance`);
  return { ok: true };
}
