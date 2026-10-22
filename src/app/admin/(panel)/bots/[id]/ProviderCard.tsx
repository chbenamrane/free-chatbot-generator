"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { Collapsible } from "@/components/Collapsible";
import { compactInput, compactLabel, compactPrimary, compactSecondary } from "@/components/form-styles";
import { PROVIDER_INFO, type Provider } from "@/lib/ai/catalog";
import { confirmDelete, toast } from "@/lib/swal";
import {
  listModelsAction,
  moveProviderAction,
  removeProviderAction,
  saveProviderAction,
  testProviderAction,
  type ProviderCheck,
} from "./provider-actions";

export type ProviderRow = {
  enabled: boolean;
  model: string;
  baseUrl: string | null;
  hasKey: boolean;
  paused: boolean;
  lastError: string | null;
};

type Props = {
  botId: string;
  provider: Provider;
  row: ProviderRow | null;
  position: number | null; // 1-based place in the priority order, null when not configured
  canMoveUp: boolean;
  canMoveDown: boolean;
};

function MoveButton({ botId, provider, direction, disabled }: { botId: string; provider: Provider; direction: "up" | "down"; disabled: boolean }) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <form action={moveProviderAction}>
      <input type="hidden" name="botId" value={botId} />
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="direction" value={direction} />
      <button disabled={disabled} aria-label={direction === "up" ? "Move up" : "Move down"} className="rounded p-0.5 hover:bg-background disabled:opacity-30">
        <Icon className="size-3.5" />
      </button>
    </form>
  );
}

export function ProviderCard({ botId, provider, row, position, canMoveUp, canMoveDown }: Props) {
  const info = PROVIDER_INFO[provider];
  const formRef = useRef<HTMLFormElement>(null);
  const listId = useId();
  const [state, save, saving] = useActionState(saveProviderAction, undefined);
  const [models, setModels] = useState<string[]>([]);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) toast(`${info.name} saved`);
  }, [state, info.name]);

  // "Test" and "List models" use what is typed in the form (even before saving).
  const run = (action: (fd: FormData) => Promise<ProviderCheck>) =>
    startTransition(async () => {
      const result = await action(new FormData(formRef.current!));
      toast(result.message, result.ok ? "success" : "error");
      if (result.models) setModels(result.models);
    });

  const title = (
    <span className="flex min-w-0 items-center gap-1.5">
      {position !== null && (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">{position}</span>
      )}
      <span className="truncate">{info.name}</span>
      <span className="hidden shrink-0 rounded-full bg-background px-1.5 py-px text-[10px] font-normal text-muted sm:inline">{info.tier}</span>
    </span>
  );

  const aside = (
    <span className="flex shrink-0 items-center gap-1">
      {row?.paused && <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] text-amber-600">Paused</span>}
      {row && !row.enabled && <span className="text-[10px] text-muted">Off</span>}
      {row?.enabled && !row.paused && <span className="size-1.5 rounded-full bg-success" title="Enabled" />}
      {row && <MoveButton botId={botId} provider={provider} direction="up" disabled={!canMoveUp} />}
      {row && <MoveButton botId={botId} provider={provider} direction="down" disabled={!canMoveDown} />}
    </span>
  );

  return (
    <Collapsible compact title={title} aside={aside}>
      <div className="space-y-2">
        <p className="text-xs text-muted">
          {info.help}{" "}
          {info.keyUrl && (
            <a href={info.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand underline">
              Get a key <ExternalLink className="size-3" />
            </a>
          )}
        </p>

        {row?.lastError && <p className="rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">Last error: {row.lastError}</p>}

        <form ref={formRef} action={save} className="space-y-2">
          <input type="hidden" name="botId" value={botId} />
          <input type="hidden" name="provider" value={provider} />

          {provider === "custom" && (
            <label className="block">
              <span className={compactLabel}>Base URL</span>
              <input name="baseUrl" defaultValue={row?.baseUrl ?? ""} placeholder="http://localhost:11434/v1" className={`${compactInput} font-mono`} />
            </label>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className={compactLabel}>API key {info.keyOptional && <span className="font-normal text-muted">(optional)</span>}</span>
              <input
                name="apiKey"
                type="password"
                autoComplete="off"
                maxLength={500}
                placeholder={row?.hasKey ? "Saved. Leave empty to keep." : "Paste your key"}
                className={`${compactInput} font-mono`}
              />
            </label>
            <label className="block">
              <span className={compactLabel}>Model</span>
              <input name="model" list={listId} defaultValue={row?.model ?? info.defaultModel} maxLength={120} className={`${compactInput} font-mono`} />
              <datalist id={listId}>{models.map((m) => <option key={m} value={m} />)}</datalist>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <label className="mr-1 flex items-center gap-1 text-xs">
              <input type="checkbox" name="enabled" defaultChecked={row?.enabled ?? true} className="accent-brand" />
              Enabled
            </label>
            <button type="submit" disabled={saving} className={compactPrimary}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" disabled={busy} onClick={() => run(testProviderAction)} className={compactSecondary}>Test</button>
            <button type="button" disabled={busy} onClick={() => run(listModelsAction)} className={compactSecondary}>List models</button>
            {row && (
              <button
                type="button"
                onClick={async () => {
                  if (await confirmDelete(`Remove ${info.name}?`, "Its saved key is deleted from this chatbot.")) {
                    await removeProviderAction(new FormData(formRef.current!));
                    toast(`${info.name} removed`, "info");
                  }
                }}
                className="ml-auto text-xs text-danger hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          {state?.error && <p role="alert" className="text-xs text-danger">{state.error}</p>}
        </form>
      </div>
    </Collapsible>
  );
}
