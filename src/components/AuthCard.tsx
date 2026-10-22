import type { ReactNode } from "react";

// Centered card used by the sign-in and first-run setup pages.
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-0.5 mb-4 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}
