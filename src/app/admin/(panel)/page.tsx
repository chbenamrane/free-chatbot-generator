import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, ThumbsDown, ThumbsUp } from "lucide-react";
import { Collapsible } from "@/components/Collapsible";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getLatestMessages, getNotices, getPerBotCounts, getStats, RANGES, type Range, type Stats } from "@/lib/stats";
import { DashboardFilters } from "./DashboardFilters";
import { LatestCountForm } from "./LatestCountForm";

export const metadata: Metadata = { title: "Dashboard" };

const pct = (part: number, whole: number) => (whole === 0 ? "–" : `${Math.round((part / whole) * 100)}%`);

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Messages per day: plain bars, readable in light and dark, with the exact figure on hover.
function DailyChart({ perDay }: { perDay: Stats["perDay"] }) {
  const max = Math.max(1, ...perDay.map((d) => d.count));
  const total = perDay.reduce((sum, d) => sum + d.count, 0);
  return (
    <div>
      <div role="img" aria-label={`Messages per day over ${perDay.length} days, ${total} in total, peak ${max} per day`} className="flex h-36 items-end gap-px">
        {perDay.map((d) => (
          <div key={d.date} title={`${d.date}: ${d.count} message${d.count === 1 ? "" : "s"}`} className="flex h-full flex-1 items-end">
            <div className="w-full rounded-t-sm bg-brand" style={{ height: d.count === 0 ? "2px" : `${Math.max(4, (d.count / max) * 100)}%`, opacity: d.count === 0 ? 0.25 : 1 }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{perDay[0]?.date}</span>
        <span>peak {max}/day</span>
        <span>{perDay.at(-1)?.date}</span>
      </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  await connection();
  const query = await searchParams;
  const rangeValue = Number(Array.isArray(query.range) ? query.range[0] : query.range);
  const range = (RANGES.find((r) => r === rangeValue) ?? 30) as Range;
  const botParam = Array.isArray(query.bot) ? query.bot[0] : query.bot;

  const bots = await db.bot.findMany({ select: { id: true, name: true, enabled: true }, orderBy: { name: "asc" } });
  const botId = bots.some((b) => b.id === botParam) ? (botParam as string) : "";

  const { dashboardLatestCount } = await db.admin.findUniqueOrThrow({ where: { id: admin.id }, select: { dashboardLatestCount: true } });
  const [stats, latest, notices, perBot] = await Promise.all([
    getStats(range, botId || undefined),
    getLatestMessages(dashboardLatestCount, botId || undefined),
    getNotices(),
    getPerBotCounts(range),
  ]);
  const messagesOf = perBot.messages;
  const pendingOf = perBot.pending;
  const rated = stats.helpful + stats.notHelpful;
  const maxProvider = Math.max(1, ...stats.providers.map((p) => p.count));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <DashboardFilters range={range} ranges={RANGES} botId={botId} bots={bots.map((b) => ({ id: b.id, name: b.name }))} />
      </div>

      {bots.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          No chatbot yet. <Link href="/admin/bots" className="text-brand underline">Create your first chatbot</Link> to see statistics here.
        </p>
      )}

      {notices.length > 0 && (
        <ul className="space-y-1.5" aria-label="Attention needed">
          {notices.map((n, i) => (
            <li key={i} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${n.level === "error" ? "border-danger/40 bg-danger/10" : "border-amber-500/40 bg-amber-500/10"}`}>
              <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${n.level === "error" ? "text-danger" : "text-amber-600"}`} />
              <span>
                <Link href={`/admin/bots/${n.botId}`} className="font-medium underline">{n.botName}</Link> {n.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-9">
        <Tile label="Messages" value={stats.messages} hint={`last ${range} days`} />
        <Tile label="Visitors" value={stats.visitors} hint="unique, from browsers" />
        <Tile label="Answered" value={pct(stats.answered, stats.messages)} hint={`${stats.unanswered} unknown · ${stats.failed} failed`} />
        <Tile label="To answer" value={stats.pending} hint="waiting for you" />
        <Tile label="Served from cache" value={pct(stats.cached, stats.messages)} hint={`${stats.aiCalls} AI calls made`} />
        <Tile label="Helpful" value={pct(stats.helpful, rated)} hint={`${stats.helpful} 👍 · ${stats.notHelpful} 👎`} />
        <Tile label="Average speed" value={stats.avgLatencyMs === null ? "–" : `${(stats.avgLatencyMs / 1000).toFixed(1)}s`} hint="AI answers only" />
        <Tile label="Leads" value={stats.leads} hint="visitor details collected" />
        <Tile label="Chatbots" value={bots.filter((b) => b.enabled).length} hint={`${bots.length} in total`} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Collapsible title="Messages per day" defaultOpen>
          <DailyChart perDay={stats.perDay} />
        </Collapsible>

        <Collapsible title="AI providers usage" aside={<span className="text-xs font-normal text-muted">{stats.aiCalls} calls</span>} defaultOpen>
          {stats.providers.length === 0 ? (
            <p className="text-sm text-muted">No AI call in this period.</p>
          ) : (
            <ul className="space-y-3">
              {stats.providers.map((p) => (
                <li key={`${p.provider}|${p.model}`} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{p.provider} <span className="font-mono text-xs font-normal text-muted">{p.model}</span></span>
                    <span className="shrink-0 tabular-nums">{p.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-background"><div className="h-full rounded-full bg-brand" style={{ width: `${(p.count / maxProvider) * 100}%` }} /></div>
                  <p className="mt-0.5 text-xs text-muted">{p.today} today{p.fallback > 0 ? ` · ${p.fallback} as fallback` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </Collapsible>
      </div>

      {!botId && bots.length > 0 && (
        <Collapsible title="Chatbots" defaultOpen>
          <ul className="divide-y divide-border">
            {bots.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <Link href={`/admin/bots/${b.id}`} className="font-medium hover:underline">{b.name}</Link>
                <span className="flex items-center gap-4 text-muted">
                  <span>{messagesOf.get(b.id) ?? 0} messages</span>
                  {(pendingOf.get(b.id) ?? 0) > 0 ? (
                    <Link href={`/admin/bots/${b.id}/messages`} className="rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">{pendingOf.get(b.id)} to answer</Link>
                  ) : (
                    <span className="text-xs">all answered</span>
                  )}
                  {!b.enabled && <span className="rounded-full bg-border px-2 py-0.5 text-xs">Disabled</span>}
                </span>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      <Collapsible title="Latest messages" aside={<LatestCountForm count={dashboardLatestCount} />} defaultOpen>
        {latest.length === 0 ? (
          <p className="text-sm text-muted">No message yet. Messages sent to your chatbots will appear here.</p>
        ) : (
          <ul className="divide-y divide-border">
            {latest.map((m) => (
              <li key={m.id} className="space-y-1 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <time dateTime={m.createdAt.toISOString()}>{m.createdAt.toLocaleString("en")}</time>
                  <Link href={`/admin/bots/${m.bot.id}/messages?filter=all`} className="rounded-full bg-background px-2 py-0.5 hover:underline">{m.bot.name}</Link>
                  {m.status === "busy" && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-danger">failed</span>}
                  {m.unanswered && !m.handled && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600">did not know</span>}
                  {m.cached && <span className="rounded-full bg-background px-2 py-0.5">cached</span>}
                  {m.provider && <span className="rounded-full bg-background px-2 py-0.5">{m.provider}{m.fallback ? " (fallback)" : ""}</span>}
                  {m.feedback === 1 && <ThumbsUp className="size-3.5 text-success" aria-label="helpful" />}
                  {m.feedback === -1 && <ThumbsDown className="size-3.5 text-danger" aria-label="not helpful" />}
                </div>
                <p className="font-medium">{m.question}</p>
                {m.answer && <p className="line-clamp-2 text-muted">{m.answer}</p>}
              </li>
            ))}
          </ul>
        )}
      </Collapsible>
    </div>
  );
}
