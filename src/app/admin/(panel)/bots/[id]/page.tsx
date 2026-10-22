import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
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
    <div className="space-y-5">
      {/* Two columns on wide screens: configuration on the left, AI providers and testing on the right. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="space-y-5">
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

          <Collapsible title="API keys">
            <KeysPanel botId={bot.id} publicKey={bot.publicKey} secretKeyHint={bot.secretKeyHint} />
          </Collapsible>

          <Collapsible title="Danger zone" danger>
            <DeleteBotButton botId={bot.id} botName={bot.name} />
          </Collapsible>
        </div>

        <div className="space-y-5">
          <ProvidersPanel botId={bot.id} />

          <Collapsible title="Try it" defaultOpen>
            <Playground botId={bot.id} />
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
