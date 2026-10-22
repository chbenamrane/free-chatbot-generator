import type { ReactNode } from "react";
import Link from "next/link";
import { Bot, LayoutDashboard, LogOut, MessageSquare } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "../login/actions";

// Navigation grows with each phase (knowledge, improvement, settings, docs).
const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bots", label: "Chatbots", icon: MessageSquare },
];

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="flex flex-1">
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-surface p-3">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-5 text-brand" /> Free Chatbot Generator
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background">
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-2.5 text-xs text-muted">
          <p className="mb-1.5 truncate">{admin.email}</p>
          <form action={logoutAction}>
            <button className="flex items-center gap-2 hover:text-foreground">
              <LogOut className="size-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5">{children}</main>
    </div>
  );
}
