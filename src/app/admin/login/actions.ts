"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import { clearFailures, getClientIp, isBlocked, recordFailure } from "@/lib/auth/rate-limit";
import { createSession, destroySession } from "@/lib/auth/session";
import { ADMIN_PATH, LOGIN_PATH } from "@/lib/auth/constants";

export type LoginState = { error?: string; email?: string } | undefined; // email: returned so the field is not cleared after an error

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128), // size cap so nobody can overload the server
});

// Same message for "unknown e-mail" and "wrong password": nothing is revealed to an attacker.
const BAD_CREDENTIALS = "Incorrect e-mail or password.";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const typedEmail = String(formData.get("email") ?? "").trim().slice(0, 254);
  if (!parsed.success) return { error: BAD_CREDENTIALS, email: typedEmail };

  const { email, password } = parsed.data;
  const ip = await getClientIp();
  if (await isBlocked(email, ip)) return { error: "Too many attempts. Try again in 15 minutes.", email };

  const admin = await db.admin.findUnique({ where: { email } });
  // Unknown admin: still verify a fake hash so the response time is identical.
  const valid = await verifyPassword(admin?.passwordHash ?? (await getDummyHash()), password);
  if (!admin || !valid) {
    await recordFailure(email, ip);
    return { error: BAD_CREDENTIALS, email };
  }

  await clearFailures(email);
  await createSession(admin.id);
  redirect(ADMIN_PATH);
}

export async function logoutAction() {
  await destroySession();
  redirect(LOGIN_PATH);
}
