import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Download } from "lucide-react";
import { Collapsible } from "@/components/Collapsible";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { parseAppearance } from "@/lib/bots/appearance";
import { parseLeadForm } from "@/lib/bots/lead-form";
import { DeleteAllLeads } from "./DeleteAllLeads";
import { LeadFormEditor } from "./LeadFormEditor";
import { LeadItem, type LeadView } from "./LeadItem";

export const metadata: Metadata = { title: "Leads" };

const PAGE_SIZE = 25;

export default async function LeadsPage({ params, searchParams }: PageProps<"/admin/bots/[id]/leads">) {
  await requireAdmin();
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);

  const bot = await db.bot.findUnique({ where: { id }, select: { id: true, name: true, publicKey: true, welcomeMessage: true, appearance: true, collect: true } });
  if (!bot) notFound();
  const form = parseLeadForm(bot.collect);

  const [leads, total] = await Promise.all([
    db.lead.findMany({ where: { botId: id }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.lead.count({ where: { botId: id } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Show the labels the admin configured; keep values of fields that were removed from the form since.
  const labels = new Map(form.fields.map((f) => [f.key, f.label]));
  const views: LeadView[] = leads.map((lead) => {
    const data = (lead.data && typeof lead.data === "object" ? lead.data : {}) as Record<string, unknown>;
    return {
      id: lead.id,
      conversationId: lead.conversationId,
      createdAt: lead.createdAt.toISOString(),
      consent: lead.consent,
      origin: lead.origin,
      data: Object.entries(data).map(([key, value]) => ({ label: labels.get(key) ?? key, value: String(value) })),
    };
  });

  return (
    <div className="space-y-5">
      <LeadFormEditor botId={bot.id} publicKey={bot.publicKey} name={bot.name} welcomeMessage={bot.welcomeMessage} appearance={parseAppearance(bot.appearance)} initial={form} />

      <Collapsible
        title={`Collected contacts (${total})`}
        defaultOpen
        aside={
          total > 0 ? (
            <a href={`/admin/bots/${id}/leads/export`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-normal hover:bg-background">
              <Download className="size-3.5" /> Export CSV
            </a>
          ) : null
        }
      >
        {total === 0 ? (
          <p className="text-sm text-muted">
            {form.enabled ? "No contact yet. Visitors who fill the form will appear here." : "The form is off. Turn it on above to start collecting details."}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid items-start gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {views.map((lead) => (
                <LeadItem key={lead.id} botId={id} lead={lead} />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <DeleteAllLeads botId={id} count={total} />
              {pages > 1 && (
                <div className="flex items-center gap-3">
                  {page > 1 && <Link href={`/admin/bots/${id}/leads?page=${page - 1}`} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">Previous</Link>}
                  <span className="text-muted">Page {page} of {pages}</span>
                  {page < pages && <Link href={`/admin/bots/${id}/leads?page=${page + 1}`} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">Next</Link>}
                </div>
              )}
            </div>
          </div>
        )}
      </Collapsible>

      <p className="max-w-3xl text-xs text-muted">
        You are responsible for the personal data you collect: tell visitors why you ask (the consent text helps), keep it only as long as needed and delete it on request.
        Contacts are stored in your own database and are never sent anywhere else.
      </p>
    </div>
  );
}
