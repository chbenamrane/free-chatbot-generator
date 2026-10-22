"use client";

import Link from "next/link";
import { Check, MessageSquare, Trash2 } from "lucide-react";
import { confirmDelete, toast } from "@/lib/swal";
import { deleteLeadAction } from "./actions";

export type LeadView = {
  id: string;
  conversationId: string;
  createdAt: string; // ISO
  consent: boolean;
  origin: string | null;
  data: { label: string; value: string }[];
};

export function LeadItem({ botId, lead }: { botId: string; lead: LeadView }) {
  return (
    <article className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      <header className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <time dateTime={lead.createdAt}>{new Date(lead.createdAt).toLocaleString("en")}</time>
        {lead.consent && <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-success"><Check className="size-3" /> consent given</span>}
        {lead.origin && <span className="truncate rounded-full bg-background px-2 py-0.5">{lead.origin}</span>}
      </header>

      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
        {lead.data.map((item) => (
          <div key={item.label} className="contents">
            <dt className="text-muted">{item.label}</dt>
            <dd className="break-words font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center gap-3 border-t border-border pt-2">
        <Link href={`/admin/bots/${botId}/messages?filter=all&conversation=${encodeURIComponent(lead.conversationId)}`} className="inline-flex items-center gap-1.5 text-brand hover:underline">
          <MessageSquare className="size-3.5" /> Conversation
        </Link>
        <form
          className="ml-auto"
          action={async (formData) => {
            if (await confirmDelete("Delete this contact?", "The details of this visitor are erased. This cannot be undone.")) {
              await deleteLeadAction(formData);
              toast("Deleted", "info");
            }
          }}
        >
          <input type="hidden" name="botId" value={botId} />
          <input type="hidden" name="leadId" value={lead.id} />
          <button className="inline-flex items-center gap-1.5 text-danger hover:underline"><Trash2 className="size-3.5" /> Delete</button>
        </form>
      </div>
    </article>
  );
}
