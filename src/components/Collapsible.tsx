import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

// Collapsible section built on the native <details> element: works without JavaScript and keeps its state
// across server re-renders. "aside" is shown on the right of the header (badges, buttons).
export function Collapsible({
  title,
  aside,
  defaultOpen = false,
  danger = false,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  defaultOpen?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className={`group rounded-xl border bg-surface ${danger ? "border-danger/30" : "border-border"}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
        <span className={`min-w-0 flex-1 text-sm font-semibold ${danger ? "text-danger" : ""}`}>{title}</span>
        {aside}
      </summary>
      <div className="border-t border-border px-3.5 py-3">{children}</div>
    </details>
  );
}
