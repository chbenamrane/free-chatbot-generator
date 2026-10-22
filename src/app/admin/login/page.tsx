import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth/session";
import { ADMIN_PATH, SETUP_PATH } from "@/lib/auth/constants";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  await connection();
  if ((await db.admin.count()) === 0) redirect(SETUP_PATH); // fresh install: create the account first
  if (await getAdmin()) redirect(ADMIN_PATH);
  return (
    <AuthCard title="Free Chatbot Generator" subtitle="Sign in to manage your chatbots.">
      <LoginForm />
    </AuthCard>
  );
}
