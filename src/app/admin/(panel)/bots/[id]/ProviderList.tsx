"use client";

import { useRef, useState, useTransition } from "react";
import { Menu } from "lucide-react";
import type { Provider } from "@/lib/ai/catalog";
import { toast } from "@/lib/swal";
import { ProviderCard, type ProviderRow } from "./ProviderCard";
import { reorderProvidersAction } from "./provider-actions";

type Item = { provider: Provider; row: ProviderRow };

// Configured providers: stacked, reorderable by drag and drop (hamburger handle) or with the arrow keys on the handle.
export function ProviderList({ botId, items }: { botId: string; items: Item[] }) {
  const serverOrder = items.map((i) => i.provider);
  const serverKey = serverOrder.join(",");
  const [order, setOrder] = useState<Provider[]>(serverOrder);
  const [syncedKey, setSyncedKey] = useState(serverKey);
  const [dragging, setDragging] = useState<Provider | null>(null);
  const startOrder = useRef<string>("");
  const [, startTransition] = useTransition();

  // Follow the server when it changes (a provider was added or removed, or the order was saved).
  if (serverKey !== syncedKey) {
    setSyncedKey(serverKey);
    setOrder(serverOrder);
  }

  const byProvider = new Map(items.map((i) => [i.provider, i]));

  const persist = (next: Provider[]) =>
    startTransition(async () => {
      await reorderProvidersAction(botId, next);
      toast("Priority order saved");
    });

  // Moves "provider" before or after "target".
  const place = (provider: Provider, target: Provider, after: boolean) =>
    setOrder((current) => {
      if (provider === target) return current;
      const without = current.filter((p) => p !== provider);
      const index = without.indexOf(target) + (after ? 1 : 0);
      return [...without.slice(0, index), provider, ...without.slice(index)];
    });

  return (
    <div className="space-y-1.5">
      {order.map((provider, index) => {
        const item = byProvider.get(provider);
        if (!item) return null;
        return (
          <div
            key={provider}
            className={dragging === provider ? "opacity-40" : undefined}
            onDragOver={(event) => {
              if (!dragging) return;
              event.preventDefault();
              const box = event.currentTarget.getBoundingClientRect();
              place(dragging, provider, event.clientY > box.top + box.height / 2);
            }}
            onDrop={(event) => event.preventDefault()}
          >
            <ProviderCard
              botId={botId}
              provider={provider}
              row={item.row}
              position={index + 1}
              handle={
                <button
                  type="button"
                  draggable
                  aria-label={`Reorder ${provider}. Drag, or use the up and down arrow keys.`}
                  title="Drag to reorder"
                  onClick={(event) => event.preventDefault()}
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", provider);
                    const card = event.currentTarget.closest("details");
                    if (card) event.dataTransfer.setDragImage(card, 16, 16);
                    startOrder.current = order.join(",");
                    setDragging(provider);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOrder((current) => {
                      if (current.join(",") !== startOrder.current) persist(current);
                      return current;
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                    event.preventDefault();
                    const target = order[index + (event.key === "ArrowUp" ? -1 : 1)];
                    if (!target) return;
                    const next = [...order];
                    [next[index], next[next.indexOf(target)]] = [target, provider];
                    setOrder(next);
                    persist(next);
                  }}
                  className="shrink-0 cursor-grab rounded p-0.5 text-muted hover:bg-background hover:text-foreground active:cursor-grabbing"
                >
                  <Menu className="size-4" />
                </button>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
