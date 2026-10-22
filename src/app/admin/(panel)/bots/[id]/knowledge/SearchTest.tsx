"use client";

import { useActionState } from "react";
import { inputClass, primaryButton } from "@/components/form-styles";
import { searchTestAction } from "./actions";

const MODE_TEXT = {
  none: "No knowledge yet.",
  all: "The knowledge is small: everything below is sent to the AI with every question.",
  search: "Best matches found by full-text search (these are sent to the AI).",
} as const;

export function SearchTest({ botId }: { botId: string }) {
  const [state, action, pending] = useActionState(searchTestAction, undefined);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Type a visitor question to see which pieces of knowledge the chatbot would use.</p>
      <form action={action} className="flex gap-2">
        <input type="hidden" name="botId" value={botId} />
        <input name="query" required maxLength={300} placeholder="What are your opening hours?" className={inputClass} />
        <button disabled={pending} className={`${primaryButton} shrink-0`}>{pending ? "Searching…" : "Search"}</button>
      </form>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.mode && (
        <div className="space-y-2" role="status">
          <p className="text-xs text-muted">{MODE_TEXT[state.mode as keyof typeof MODE_TEXT]}</p>
          {state.mode === "search" && state.hits?.length === 0 && <p className="text-sm text-danger">Nothing relevant found: the chatbot would answer that it does not know.</p>}
          {state.hits?.map((hit) => (
            <div key={hit.id} className="rounded-lg bg-background p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-muted">{hit.title}{state.mode === "search" && ` · score ${hit.rank.toFixed(2)}`}</p>
              <p className="whitespace-pre-wrap">{hit.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
