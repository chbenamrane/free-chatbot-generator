"use client";

import { useActionState, useId, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { inputClass } from "@/components/form-styles";
import { PROVIDER_INFO, type Provider } from "@/lib/ai/catalog";
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
  pausedUntil: string | null; // ISO date
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

const smallButton = "rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50";

export function ProviderCard({ botId, provider, row, position, canMoveUp, canMoveDown }: Props) {
  const info = PROVIDER_INFO[provider];
  const formRef = useRef<HTMLFormElement>(null);
  const listId = useId();
  const [state, save, saving] = useActionState(saveProviderAction, undefined);
  const [check, setCheck] = useState<ProviderCheck | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [busy, startTransition] = useTransition();

  // "Test" and "List models" use what is typed in the form (even before saving).
  const run = (action: (fd: FormData) => Promise<ProviderCheck>) =>
    startTransition(async () => {
      const result = await action(new FormData(formRef.current!));
      setCheck(result);
      if (result.models) setModels(result.models);
    });

  const paused = row?.pausedUntil && new Date(row.pausedUntil) > new Date();

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header className="flex flex-wrap items-center gap-2">
        {position !== null && <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">{position}</span>}
        <h3 className="font-medium">{info.name}</h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">{info.tag}</span>
        {row && !row.enabled && <span className="text-xs text-muted">Disabled</span>}
        {paused && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">Paused after an error</span>}
        {row && (
          <div className="ml-auto flex gap-1">
            <form action={moveProviderAction}>
              <input type="hidden" name="botId" value={botId} />
              <input type="hidden" name="provider" value={provider} />
              <input type="hidden" name="direction" value="up" />
              <button disabled={!canMoveUp} aria-label="Move up" className="rounded p-1 hover:bg-background disabled:opacity-30"><ArrowUp className="size-4" /></button>
            </form>
            <form action={moveProviderAction}>
              <input type="hidden" name="botId" value={botId} />
              <input type="hidden" name="provider" value={provider} />
              <input type="hidden" name="direction" value="down" />
              <button disabled={!canMoveDown} aria-label="Move down" className="rounded p-1 hover:bg-background disabled:opacity-30"><ArrowDown className="size-4" /></button>
            </form>
          </div>
        )}
      </header>

      <p className="text-xs text-muted">
        {info.help}{" "}
        {info.keyUrl && (
          <a href={info.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand underline">
            Get a key <ExternalLink className="size-3" />
          </a>
        )}
      </p>

      {row?.lastError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">Last error: {row.lastError}</p>}

      <form ref={formRef} action={save} className="space-y-3">
        <input type="hidden" name="botId" value={botId} />
        <input type="hidden" name="provider" value={provider} />

        {provider === "custom" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Base URL</span>
            <input name="baseUrl" defaultValue={row?.baseUrl ?? ""} placeholder="http://localhost:11434/v1" className={`${inputClass} font-mono`} />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">API key {info.keyOptional && <span className="font-normal text-muted">(optional)</span>}</span>
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            maxLength={500}
            placeholder={row?.hasKey ? "Saved. Leave empty to keep it." : "Paste your key"}
            className={`${inputClass} font-mono`}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Model</span>
          <input name="model" list={listId} defaultValue={row?.model ?? info.defaultModel} maxLength={120} className={`${inputClass} font-mono`} />
          <datalist id={listId}>{models.map((m) => <option key={m} value={m} />)}</datalist>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={row?.enabled ?? true} className="accent-brand" />
          Enabled
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" disabled={busy} onClick={() => run(testProviderAction)} className={smallButton}>Test</button>
          <button type="button" disabled={busy} onClick={() => run(listModelsAction)} className={smallButton}>List models</button>
          {state?.ok && <span role="status" className="text-sm text-emerald-600">Saved.</span>}
          {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
          {check && <span role="status" className={`text-sm ${check.ok ? "text-emerald-600" : "text-danger"}`}>{check.message}</span>}
        </div>
      </form>

      {row && (
        <form
          action={removeProviderAction}
          onSubmit={(e) => {
            if (!window.confirm(`Remove ${info.name} from this chatbot? Its saved key is deleted.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="botId" value={botId} />
          <input type="hidden" name="provider" value={provider} />
          <button className="text-xs text-danger hover:underline">Remove from this chatbot</button>
        </form>
      )}
    </section>
  );
}
