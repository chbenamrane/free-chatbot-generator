import type { ReactNode } from "react";
import Link from "next/link";
import { Bot, LayoutDashboard, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "../login/actions";

// Navigation grows with each phase (bots, knowledge, improvement, settings, docs).
const NAV = [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }];

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="flex flex-1">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface p-4">
        <div className="mb-6 flex items-center gap-2 font-semibold">
          <Bot className="size-5 text-brand" /> Free Chatbot Generator
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-background">
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-3 text-xs text-muted">
          <p className="mb-2 truncate">{admin.email}</p>
          <form action={logoutAction}>
            <button className="flex items-center gap-2 text-sm hover:text-foreground">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
