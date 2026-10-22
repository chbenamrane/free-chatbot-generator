"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/form-styles";

type Props = { range: number; ranges: readonly number[]; botId: string; bots: { id: string; name: string }[] };

export function DashboardFilters({ range, ranges, botId, bots }: Props) {
  const router = useRouter();
  const url = (nextRange: number, nextBot: string) => `/admin?range=${nextRange}${nextBot ? `&bot=${nextBot}` : ""}`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="Period">
        {ranges.map((r) => (
          <Link
            key={r}
            href={url(r, botId)}
            aria-current={r === range ? "true" : undefined}
            className={`rounded-md px-3 py-1 text-sm ${r === range ? "bg-brand text-brand-foreground" : "text-muted hover:text-foreground"}`}
          >
            {r} days
          </Link>
        ))}
      </div>
      <select
        aria-label="Chatbot"
        value={botId}
        onChange={(event) => router.push(url(range, event.target.value))}
        className={`${inputClass} !w-auto min-w-44`}
      >
        <option value="">All chatbots</option>
        {bots.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}
