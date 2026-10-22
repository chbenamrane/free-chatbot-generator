"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

export type CountState = { ok?: boolean; error?: string } | undefined;

// How many latest messages the dashboard lists (1 to 100).
export async function setLatestCountAction(_prev: CountState, formData: FormData): Promise<CountState> {
  const admin = await requireAdmin();
  const value = Number(formData.get("count"));
  if (!Number.isInteger(value) || value < 1 || value > 100) return { error: "Choose a number between 1 and 100." };
  await db.admin.update({ where: { id: admin.id }, data: { dashboardLatestCount: value } });
  revalidatePath("/admin");
  return { ok: true };
}
