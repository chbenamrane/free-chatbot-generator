"use client";

import { useActionState } from "react";
import { inputClass, primaryButton } from "@/components/form-styles";
import { playgroundAction } from "./provider-actions";

export function Playground({ botId }: { botId: string }) {
  const [state, action, pending] = useActionState(playgroundAction, undefined);
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted">Send a message as a visitor would. This uses the saved settings.</p>
      <form action={action} className="flex gap-2">
        <input type="hidden" name="botId" value={botId} />
        <input name="message" required maxLength={1000} placeholder="Hello! What can you do?" className={inputClass} />
        <button disabled={pending} className={`${primaryButton} shrink-0`}>
          {pending ? "Thinking…" : "Send"}
        </button>
      </form>
      {state?.answer && (
        <div role="status" className="space-y-1 rounded-md bg-background p-3 text-sm">
          <p className="whitespace-pre-wrap">{state.answer}</p>
          <p className="text-xs text-muted">via {state.via}</p>
        </div>
      )}
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </div>
  );
}
