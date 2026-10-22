import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { BotSettingsForm } from "./BotSettingsForm";
import { DeleteBotButton } from "./DeleteBotButton";
import { KeysPanel } from "./KeysPanel";
import { Playground } from "./Playground";
import { ProvidersPanel } from "./ProvidersPanel";

export const metadata: Metadata = { title: "Chatbot" };

export default async function BotPage({ params }: PageProps<"/admin/bots/[id]">) {
  await requireAdmin();
  await connection();
  const { id } = await params;
  const bot = await db.bot.findUnique({ where: { id } });
  if (!bot) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/bots" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> All chatbots
        </Link>
        <h1 className="text-2xl font-semibold">{bot.name}</h1>
      </div>

      <BotSettingsForm
        bot={{
          id: bot.id,
          name: bot.name,
          description: bot.description,
          welcomeMessage: bot.welcomeMessage,
          instructions: bot.instructions,
          languages: bot.languages,
          allowedOrigins: bot.allowedOrigins,
          enabled: bot.enabled,
        }}
      />
      <ProvidersPanel botId={bot.id} />
      <Playground botId={bot.id} />
      <KeysPanel botId={bot.id} publicKey={bot.publicKey} secretKeyHint={bot.secretKeyHint} />

      <section className="space-y-3 rounded-2xl border border-danger/30 bg-surface p-6">
        <h2 className="font-semibold text-danger">Danger zone</h2>
        <DeleteBotButton botId={bot.id} botName={bot.name} />
      </section>
    </div>
  );
}
