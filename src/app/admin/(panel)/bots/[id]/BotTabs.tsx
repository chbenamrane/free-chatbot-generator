"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "", label: "Configuration" },
  { path: "/knowledge", label: "Knowledge" },
  { path: "/messages", label: "Messages" },
  { path: "/leads", label: "Leads" },
  { path: "/appearance", label: "Appearance" },
  { path: "/embed", label: "Embed & API" },
];

export function BotTabs({ botId, toAnswer = 0 }: { botId: string; toAnswer?: number }) {
  const pathname = usePathname();
  const base = `/admin/bots/${botId}`;
  return (
    <nav className="flex gap-1 border-b border-border" aria-label="Chatbot sections">
      {TABS.map((tab) => {
        const href = base + tab.path;
        const active = tab.path === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.path}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${active ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {tab.label}
            {tab.path === "/messages" && toAnswer > 0 && <span className="ml-1.5 rounded-full bg-brand px-1.5 py-px text-xs text-brand-foreground">{toAnswer}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
