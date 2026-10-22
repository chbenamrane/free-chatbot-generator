import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { needsAnswer } from "@/lib/chat/improve";
import { MessageItem } from "./MessageItem";

export const metadata: Metadata = { title: "Messages" };

const PAGE_SIZE = 25;
const FILTERS = [
  { id: "unanswered", label: "To answer" },
  { id: "negative", label: "Not helpful" },
  { id: "all", label: "All messages" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

export default async function MessagesPage({ params, searchParams }: PageProps<"/admin/bots/[id]/messages">) {
  await requireAdmin();
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.id === query.filter) ? (query.filter as Filter) : "unanswered";
  const conversation = typeof query.conversation === "string" ? query.conversation.slice(0, 64) : "";
  const page = Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);

  const where: Prisma.ChatLogWhereInput =
    filter === "unanswered" ? { botId: id, ...needsAnswer } : filter === "negative" ? { botId: id, feedback: -1, handled: false } : { botId: id, ...(conversation ? { conversationId: conversation } : {}) };

  const [logs, total, toAnswer, negative] = await Promise.all([
    db.chatLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.chatLog.count({ where }),
    db.chatLog.count({ where: { botId: id, ...needsAnswer } }),
    db.chatLog.count({ where: { botId: id, feedback: -1, handled: false } }),
  ]);
  const counts: Record<Filter, number | null> = { unanswered: toAnswer, negative, all: null };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (f: Filter, p = 1) => `/admin/bots/${id}/messages?filter=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted">
        Questions the chatbot could not answer land here. Write the right answer once and it is added to the chatbot&apos;s knowledge: the next visitor who asks gets it.
      </p>

      {conversation && filter === "all" && (
        <p className="text-sm">
          Showing one conversation. <Link href={`/admin/bots/${id}/messages?filter=all`} className="text-brand underline">Show all messages</Link>
        </p>
      )}

      <nav className="flex flex-wrap gap-1.5" aria-label="Message filters">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href(f.id)}
            aria-current={filter === f.id ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-sm ${filter === f.id ? "border-brand bg-brand/10 text-brand" : "border-border hover:bg-surface"}`}
          >
            {f.label}
            {counts[f.id] ? <span className="ml-1.5 rounded-full bg-brand px-1.5 py-px text-xs text-brand-foreground">{counts[f.id]}</span> : null}
          </Link>
        ))}
      </nav>

      {logs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {filter === "all" ? "No message yet." : "Nothing to do here. Great!"}
        </p>
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {logs.map((log) => (
            <MessageItem
              key={log.id}
              botId={id}
              canTeach={filter !== "all" || log.unanswered || log.status === "busy" || log.feedback === -1}
              message={{
                id: log.id,
                createdAt: log.createdAt.toISOString(),
                question: log.question,
                answer: log.answer,
                status: log.status,
                unanswered: log.unanswered,
                handled: log.handled,
                feedback: log.feedback,
                cached: log.cached,
                provider: log.provider,
                fallback: log.fallback,
              }}
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={href(filter, page - 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">Previous</Link>}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages && <Link href={href(filter, page + 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">Next</Link>}
        </div>
      )}
    </div>
  );
}
