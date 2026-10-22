"use client";

import { useActionState } from "react";
import { secondaryButton } from "@/components/form-styles";
import { confirmDialog } from "@/lib/swal";
import { generateSecretKeyAction, revokeSecretKeyAction } from "../actions";

type Props = { botId: string; publicKey: string; secretKeyHint: string | null };

export function KeysPanel({ botId, publicKey, secretKeyHint }: Props) {
  const [state, generate, pending] = useActionState(generateSecretKeyAction, undefined);
  const hasSecret = secretKeyHint !== null;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-1 text-xs font-medium">Public key</p>
        <code className="block break-all rounded-md bg-background px-2.5 py-1.5 font-mono text-xs">{publicKey}</code>
        <p className="mt-1 text-xs text-muted">Goes in the website snippet. Safe to expose: it only works from the allowed origins.</p>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium">Secret key</p>
        {state?.secret ? (
          <div role="status" className="space-y-1">
            <code className="block break-all rounded-md bg-background px-2.5 py-1.5 font-mono text-xs">{state.secret}</code>
            <p className="text-xs text-amber-600">Copy it now: it will never be shown again.</p>
          </div>
        ) : (
          <p className="text-muted">{hasSecret ? `sk_…${secretKeyHint}` : "No secret key yet."}</p>
        )}
        <p className="mt-1 text-xs text-muted">
          For calls from your own server (REST API). Never put it in a web page or a mobile app. A new key invalidates the previous one.
        </p>
        {state?.error && <p role="alert" className="mt-1 text-danger">{state.error}</p>}
        <div className="mt-2 flex gap-2">
          <form
            action={async (formData) => {
              if (hasSecret && !(await confirmDialog({ title: "Replace the secret key?", text: "The current key stops working immediately.", confirmText: "Replace", danger: true }))) return;
              generate(formData);
            }}
          >
            <input type="hidden" name="id" value={botId} />
            <button disabled={pending} className={secondaryButton}>
              {hasSecret ? "Regenerate" : "Generate"} secret key
            </button>
          </form>
          {hasSecret && (
            <form
              action={async (formData) => {
                if (await confirmDialog({ title: "Revoke the secret key?", text: "Servers using it will be refused.", confirmText: "Revoke", danger: true })) {
                  await revokeSecretKeyAction(formData);
                }
              }}
            >
              <input type="hidden" name="id" value={botId} />
              <button className={`${secondaryButton} text-danger`}>Revoke</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
