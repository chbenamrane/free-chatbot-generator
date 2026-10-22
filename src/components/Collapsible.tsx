import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

// Collapsible section built on the native <details> element: works without JavaScript and keeps its state
// across server re-renders. "aside" is shown on the right of the header (badges, buttons).
// "compact" gives a tighter header and body, and lets an opened card span the whole row of a grid.
export function Collapsible({
  title,
  aside,
  defaultOpen = false,
  danger = false,
  compact = false,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  defaultOpen?: boolean;
  danger?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={`group border bg-surface ${compact ? "rounded-lg open:col-span-full" : "rounded-2xl"} ${danger ? "border-danger/30" : "border-border"}`}
    >
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 select-none [&::-webkit-details-marker]:hidden ${compact ? "px-2.5 py-1.5" : "px-5 py-3.5"}`}
      >
        <ChevronRight className={`shrink-0 text-muted transition-transform group-open:rotate-90 ${compact ? "size-3.5" : "size-4"}`} />
        <span className={`min-w-0 flex-1 font-semibold ${compact ? "text-xs" : "text-sm"} ${danger ? "text-danger" : ""}`}>{title}</span>
        {aside}
      </summary>
      <div className={`border-t border-border ${compact ? "px-2.5 py-2.5" : "p-5"}`}>{children}</div>
    </details>
  );
}
