"use client";

import { useActionState } from "react";
import { generateSecretKeyAction, revokeSecretKeyAction } from "../actions";

type Props = { botId: string; publicKey: string; secretKeyHint: string | null };

export function KeysPanel({ botId, publicKey, secretKeyHint }: Props) {
  const [state, action, pending] = useActionState(generateSecretKeyAction, undefined);
  const hasSecret = secretKeyHint !== null;

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-semibold">API keys</h2>

      <div className="text-sm">
        <p className="mb-1 font-medium">Public key</p>
        <code className="block break-all rounded-lg bg-background px-3 py-2 font-mono text-xs">{publicKey}</code>
        <p className="mt-1 text-xs text-muted">Goes in the website snippet. Safe to expose: it only works from the allowed origins.</p>
      </div>

      <div className="text-sm">
        <p className="mb-1 font-medium">Secret key</p>
        {state?.secret ? (
          <div role="status" className="space-y-1">
            <code className="block break-all rounded-lg bg-background px-3 py-2 font-mono text-xs">{state.secret}</code>
            <p className="text-xs text-amber-600">Copy it now: it will never be shown again.</p>
          </div>
        ) : (
          <p className="text-muted">{hasSecret ? `sk_…${secretKeyHint}` : "No secret key yet."}</p>
        )}
        <p className="mt-1 text-xs text-muted">
          For calls from your own server (REST API). Never put it in a web page or a mobile app. Generating a new key invalidates the previous one.
        </p>
        {state?.error && <p role="alert" className="mt-1 text-sm text-danger">{state.error}</p>}
        <div className="mt-3 flex gap-3">
          <form action={action}>
            <input type="hidden" name="id" value={botId} />
            <button disabled={pending} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50">
              {hasSecret ? "Regenerate" : "Generate"} secret key
            </button>
          </form>
          {hasSecret && (
            <form action={revokeSecretKeyAction}>
              <input type="hidden" name="id" value={botId} />
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-background">Revoke</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
