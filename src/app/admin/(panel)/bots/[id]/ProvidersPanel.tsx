import { Collapsible } from "@/components/Collapsible";
import { db } from "@/lib/db";
import { PROVIDER_IDS } from "@/lib/ai/catalog";
import { ProviderCard } from "./ProviderCard";

// Configured providers first (in priority order), then the ones that can still be added.
// Cards are compact and laid out in a grid; an opened card takes the whole row (see Collapsible "compact").
export async function ProvidersPanel({ botId }: { botId: string }) {
  const rows = await db.botProvider.findMany({ where: { botId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const configured = rows.map((r) => r.provider);
  const available = PROVIDER_IDS.filter((p) => !configured.includes(p));
  const now = new Date();
  const grid = "grid items-start gap-2 sm:grid-cols-2";

  return (
    <Collapsible
      title="AI providers"
      aside={<span className="text-xs text-muted">{rows.filter((r) => r.enabled).length} active</span>}
      defaultOpen
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          The first enabled provider answers (number 1). When it hits its quota or fails, the next one takes over and the failing one is
          skipped for a while. Each chatbot has its own keys, stored encrypted.
        </p>

        {rows.length > 0 && (
          <div className={grid}>
            {rows.map((row, i) => {
              const provider = PROVIDER_IDS.find((p) => p === row.provider);
              if (!provider) return null;
              return (
                <ProviderCard
                  key={row.id}
                  botId={botId}
                  provider={provider}
                  position={i + 1}
                  canMoveUp={i > 0}
                  canMoveDown={i < rows.length - 1}
                  row={{
                    enabled: row.enabled,
                    model: row.model,
                    baseUrl: row.baseUrl,
                    hasKey: Boolean(row.keyEnc),
                    paused: Boolean(row.pausedUntil && row.pausedUntil > now),
                    lastError: row.lastError,
                  }}
                />
              );
            })}
          </div>
        )}

        {available.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">{rows.length > 0 ? "Add a provider" : "Pick a provider to start"}</p>
            <div className={grid}>
              {available.map((provider) => (
                <ProviderCard key={provider} botId={botId} provider={provider} row={null} position={null} canMoveUp={false} canMoveDown={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Collapsible>
  );
}
