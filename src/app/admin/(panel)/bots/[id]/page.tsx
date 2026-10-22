import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { Collapsible } from "@/components/Collapsible";
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
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center gap-3">
        <Link href="/admin/bots" aria-label="All chatbots" className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">{bot.name}</h1>
        {!bot.enabled && <span className="rounded-full bg-border px-2 py-0.5 text-xs text-muted">Disabled</span>}
      </div>

      <Collapsible title="Settings" defaultOpen>
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
      </Collapsible>

      <ProvidersPanel botId={bot.id} />

      <Collapsible title="Try it" defaultOpen>
        <Playground botId={bot.id} />
      </Collapsible>

      <Collapsible title="API keys">
        <KeysPanel botId={bot.id} publicKey={bot.publicKey} secretKeyHint={bot.secretKeyHint} />
      </Collapsible>

      <Collapsible title="Danger zone" danger>
        <DeleteBotButton botId={bot.id} botName={bot.name} />
      </Collapsible>
    </div>
  );
}
