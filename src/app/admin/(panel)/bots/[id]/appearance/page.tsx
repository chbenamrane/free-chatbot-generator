import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { parseAppearance } from "@/lib/bots/appearance";
import { parseLeadForm, publicLeadForm } from "@/lib/bots/lead-form";
import { AppearanceEditor } from "./AppearanceEditor";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage({ params }: PageProps<"/admin/bots/[id]/appearance">) {
  await requireAdmin();
  await connection();
  const { id } = await params;
  const bot = await db.bot.findUnique({ where: { id }, select: { id: true, name: true, publicKey: true, welcomeMessage: true, appearance: true, collect: true } });
  if (!bot) notFound();

  return <AppearanceEditor botId={bot.id} publicKey={bot.publicKey} name={bot.name} welcomeMessage={bot.welcomeMessage} initial={parseAppearance(bot.appearance)} collect={publicLeadForm(parseLeadForm(bot.collect))} />;
}
