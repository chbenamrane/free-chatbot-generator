"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/form-styles";
import { playgroundAction } from "./provider-actions";

export function Playground({ botId }: { botId: string }) {
  const [state, action, pending] = useActionState(playgroundAction, undefined);
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-semibold">Try it</h2>
      <p className="text-sm text-muted">Send a message as a visitor would. Save your settings first: this uses the saved version.</p>
      <form action={action} className="flex gap-2">
        <input type="hidden" name="botId" value={botId} />
        <input name="message" required maxLength={1000} placeholder="Hello! What can you do?" className={inputClass} />
        <button disabled={pending} className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50">
          {pending ? "Thinking…" : "Send"}
        </button>
      </form>
      {state?.answer && (
        <div role="status" className="space-y-1 rounded-lg bg-background p-4 text-sm">
          <p className="whitespace-pre-wrap">{state.answer}</p>
          <p className="text-xs text-muted">via {state.via}</p>
        </div>
      )}
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </section>
  );
}
