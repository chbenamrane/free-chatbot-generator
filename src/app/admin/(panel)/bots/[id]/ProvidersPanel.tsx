import { db } from "@/lib/db";
import { PROVIDER_IDS } from "@/lib/ai/catalog";
import { ProviderCard } from "./ProviderCard";

// Configured providers first (in priority order), then the ones that can still be added.
export async function ProvidersPanel({ botId }: { botId: string }) {
  const rows = await db.botProvider.findMany({ where: { botId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const configured = rows.map((r) => r.provider);
  const available = PROVIDER_IDS.filter((p) => !configured.includes(p));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">AI providers</h2>
        <p className="text-sm text-muted">
          The first enabled provider answers. When it hits its quota or fails, the next one takes over automatically and the failing one
          is skipped for a while. Each chatbot has its own keys, which are stored encrypted.
        </p>
      </div>

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
              pausedUntil: row.pausedUntil?.toISOString() ?? null,
              lastError: row.lastError,
            }}
          />
        );
      })}

      {available.length > 0 && (
        <>
          <h3 className="pt-2 text-sm font-medium text-muted">Add a provider</h3>
          {available.map((provider) => (
            <ProviderCard key={provider} botId={botId} provider={provider} row={null} position={null} canMoveUp={false} canMoveDown={false} />
          ))}
        </>
      )}
    </section>
  );
}
