"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, isStrongPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ADMIN_PATH, LOGIN_PATH } from "@/lib/auth/constants";

// When SETUP_TOKEN is set, the first account can only be created by someone who knows it (a fresh public instance
// would otherwise belong to the first visitor).
function tokenMatches(given: string) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return true;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type SetupState = { error?: string; email?: string } | undefined;

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().max(128),
  confirm: z.string().max(128),
});

// Creates the one and only admin. Refused as soon as an admin exists.
export async function setupAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const typedEmail = String(formData.get("email") ?? "").trim().slice(0, 254);
  if ((await db.admin.count()) > 0) redirect(LOGIN_PATH);

  if (!tokenMatches(String(formData.get("token") ?? ""))) return { error: "Incorrect setup token.", email: typedEmail };

  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: "Enter a valid e-mail address.", email: typedEmail };

  const { email, password, confirm } = parsed.data;
  if (!isStrongPassword(password)) return { error: "The password must be 12 to 128 characters long.", email };
  if (password !== confirm) return { error: "The two passwords do not match.", email };

  let adminId: string;
  try {
    adminId = (await db.admin.create({ data: { email, passwordHash: await hashPassword(password) } })).id;
  } catch {
    // The unique "singleton" column refuses a second admin (two setups at the same time).
    redirect(LOGIN_PATH);
  }
  await createSession(adminId);
  redirect(ADMIN_PATH);
}
