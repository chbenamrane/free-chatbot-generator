import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { db } from "@/lib/db";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { SetupForm } from "./SetupForm";

export const metadata: Metadata = { title: "Setup" };

export default async function SetupPage() {
  await connection(); // the answer depends on the database: never prerender
  if ((await db.admin.count()) > 0) redirect(LOGIN_PATH);
  return (
    <AuthCard title="Welcome" subtitle="Create the admin account of this instance. This page disappears once an account exists.">
      <SetupForm needsToken={Boolean(process.env.SETUP_TOKEN)} />
    </AuthCard>
  );
}
