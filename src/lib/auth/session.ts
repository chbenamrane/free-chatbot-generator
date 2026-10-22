// Admin sessions.
// On sign-in we create a random token, put it in a cookie (unreadable by JavaScript) and store its
// SHA-256 hash in the database. On each request we read the cookie and check the database,
// so a session can be revoked at any time (sign-out, password change).

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LOGIN_PATH, SESSION_COOKIE } from "./constants";

const isProd = process.env.NODE_ENV === "production";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8; // 8 hours

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Housekeeping: expired sessions are useless.
  await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.adminSession.create({ data: { tokenHash: hashToken(token), adminId, expiresAt } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // browser JavaScript cannot read this cookie (protects against theft through XSS)
    secure: isProd, // HTTPS only in production
    sameSite: "strict", // never sent from another site (protects against CSRF)
    path: "/",
    expires: expiresAt,
  });
}

// Returns the signed-in admin, or null.
export async function getAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: { select: { id: true, email: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.admin;
}

// Call at the start of EVERY admin page and EVERY server action.
// Never rely on the layout alone: it is not re-run on every navigation.
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect(LOGIN_PATH);
  return admin;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}
