import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Collapsible } from "@/components/Collapsible";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { languageName } from "@/lib/languages";
import { CreateBotForm } from "./CreateBotForm";

export const metadata: Metadata = { title: "Chatbots" };

export default async function BotsPage() {
  await requireAdmin();
  await connection();
  const bots = await db.bot.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Chatbots</h1>
        <p className="mt-1 text-sm text-muted">Each chatbot has its own keys, languages, knowledge and appearance.</p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_26rem]">
        {bots.length > 0 ? (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {bots.map((bot) => (
              <li key={bot.id}>
                <Link href={`/admin/bots/${bot.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-background">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{bot.name}</p>
                    <p className="truncate text-xs text-muted">{bot.languages.map(languageName).join(", ")}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${bot.enabled ? "bg-success/15 text-success" : "bg-border text-muted"}`}>
                    {bot.enabled ? "Enabled" : "Disabled"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">No chatbot yet. Create your first one.</p>
        )}

        <Collapsible title="New chatbot" defaultOpen>
          <CreateBotForm />
        </Collapsible>
      </div>
    </div>
  );
}
