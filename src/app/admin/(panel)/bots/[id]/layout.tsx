import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { needsAnswer } from "@/lib/chat/improve";
import { BotTabs } from "./BotTabs";

// Header and tabs shared by every page of a chatbot.
export default async function BotLayout({ children, params }: LayoutProps<"/admin/bots/[id]">) {
  await requireAdmin();
  await connection();
  const { id } = await params;
  const bot = await db.bot.findUnique({ where: { id }, select: { id: true, name: true, enabled: true } });
  if (!bot) notFound();
  const toAnswer = await db.chatLog.count({ where: { botId: bot.id, ...needsAnswer } });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/bots" aria-label="All chatbots" className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold">{bot.name}</h1>
        {!bot.enabled && <span className="rounded-full bg-border px-2.5 py-0.5 text-xs text-muted">Disabled</span>}
      </div>
      <BotTabs botId={bot.id} toAnswer={toAnswer} />
      {children}
    </div>
  );
}
