import { Collapsible } from "@/components/Collapsible";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto/secret-box";
import { PROVIDER_IDS } from "@/lib/ai/catalog";
import { ProviderCard } from "./ProviderCard";
import { ProviderList } from "./ProviderList";

// Configured providers first (stacked, in priority order), then the ones that can still be added.
export async function ProvidersPanel({ botId }: { botId: string }) {
  const rows = await db.botProvider.findMany({ where: { botId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const configured = rows.map((r) => r.provider);
  const available = PROVIDER_IDS.filter((p) => !configured.includes(p));
  const now = new Date();

  const items = rows.flatMap((row) => {
    const provider = PROVIDER_IDS.find((p) => p === row.provider);
    if (!provider) return [];
    return [
      {
        provider,
        row: {
          enabled: row.enabled,
          model: row.model,
          baseUrl: row.baseUrl,
          hasKey: Boolean(row.keyEnc),
          keyReadable: !row.keyEnc || decryptSecret(row.keyEnc) !== null,
          paused: Boolean(row.pausedUntil && row.pausedUntil > now),
          lastError: row.lastError,
        },
      },
    ];
  });

  return (
    <Collapsible
      title="AI providers"
      aside={<span className="text-xs text-muted">{rows.filter((r) => r.enabled).length} active</span>}
      defaultOpen
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          The provider at the top answers first. When it hits its quota or fails, the next one takes over and the failing one is skipped
          for a while. Drag the <span className="font-medium">≡</span> handle to change the order. Each chatbot has its own keys, stored encrypted.
        </p>

        {items.length > 0 && <ProviderList botId={botId} items={items} />}

        {available.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">{items.length > 0 ? "Add a provider" : "Pick a provider to start"}</p>
            <div className="space-y-1.5">
              {available.map((provider) => (
                <ProviderCard key={provider} botId={botId} provider={provider} row={null} position={null} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Collapsible>
  );
}
