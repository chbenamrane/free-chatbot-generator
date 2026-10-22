"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { snapshotKeysQuietly } from "@/lib/backup/keys";
import { generatePublicKey, generateSecretKey } from "@/lib/bots/keys";
import { createBotSchema, parseOrigins, slugify, updateBotSchema } from "@/lib/bots/validation";

export type FormState = { error?: string; ok?: boolean } | undefined;
export type SecretKeyState = { error?: string; secret?: string } | undefined;

// A slug is unique: "my-bot", then "my-bot-3f9a" if it is already taken.
async function uniqueSlug(name: string) {
  const base = slugify(name);
  if (!(await db.bot.findUnique({ where: { slug: base }, select: { id: true } }))) return base;
  return `${base}-${randomBytes(2).toString("hex")}`;
}

export async function createBotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = createBotSchema.safeParse({ name: formData.get("name"), languages: formData.getAll("languages") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data." };

  const bot = await db.bot.create({
    data: { ...parsed.data, slug: await uniqueSlug(parsed.data.name), publicKey: generatePublicKey(), allowedOrigins: [] },
  });
  redirect(`/admin/bots/${bot.id}`);
}

export async function updateBotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const parsed = updateBotSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    welcomeMessage: formData.get("welcomeMessage") ?? "",
    instructions: formData.get("instructions") ?? "",
    languages: formData.getAll("languages"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data." };

  const allowedOrigins = parseOrigins(String(formData.get("allowedOrigins") ?? ""));
  if (!allowedOrigins) return { error: "Allowed origins: one valid http(s) address per line (20 at most)." };

  const result = await db.bot.updateMany({
    where: { id },
    data: { ...parsed.data, allowedOrigins, enabled: formData.get("enabled") === "on" },
  });
  if (result.count === 0) return { error: "This chatbot no longer exists." };

  revalidatePath("/admin/bots");
  revalidatePath(`/admin/bots/${id}`);
  return { ok: true };
}

// Generates (or replaces) the secret key. The key is returned once and never stored in clear.
export async function generateSecretKeyAction(_prev: SecretKeyState, formData: FormData): Promise<SecretKeyState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const { key, hash, hint } = generateSecretKey();
  const result = await db.bot.updateMany({ where: { id }, data: { secretKeyHash: hash, secretKeyHint: hint } });
  if (result.count === 0) return { error: "This chatbot no longer exists." };
  revalidatePath(`/admin/bots/${id}`);
  return { secret: key };
}

export async function revokeSecretKeyAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await db.bot.updateMany({ where: { id }, data: { secretKeyHash: null, secretKeyHint: null } });
  revalidatePath(`/admin/bots/${id}`);
}

export async function deleteBotAction(formData: FormData) {
  await requireAdmin();
  await snapshotKeysQuietly("before-delete-bot"); // the keys of the deleted chatbot stay recoverable in ./backups
  await db.bot.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidatePath("/admin/bots");
  redirect("/admin/bots");
}
