"use client";

import { useActionState, useEffect } from "react";
import { Check, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { inputClass, primaryButton, secondaryButton } from "@/components/form-styles";
import { confirmDialog, toast } from "@/lib/swal";
import { dismissAction, teachAction } from "./actions";

export type MessageView = {
  id: string;
  createdAt: string; // ISO
  question: string;
  answer: string;
  status: string;
  unanswered: boolean;
  handled: boolean;
  feedback: number;
  cached: boolean;
  provider: string | null;
  fallback: boolean;
};

export function MessageItem({ botId, message, canTeach }: { botId: string; message: MessageView; canTeach: boolean }) {
  const [state, teach, pending] = useActionState(teachAction, undefined);

  useEffect(() => {
    if (state?.ok) toast(state.message ?? "Learned");
  }, [state]);

  const failed = message.status === "busy";

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <header className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("en")}</time>
        {failed && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-danger">No AI provider could answer</span>}
        {message.unanswered && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600">Did not know</span>}
        {message.feedback === 1 && <ThumbsUp className="size-3.5 text-success" aria-label="Marked helpful" />}
        {message.feedback === -1 && <ThumbsDown className="size-3.5 text-danger" aria-label="Marked not helpful" />}
        {message.cached && <span className="rounded-full bg-background px-2 py-0.5">cached</span>}
        {message.provider && <span className="rounded-full bg-background px-2 py-0.5">{message.provider}{message.fallback ? " (fallback)" : ""}</span>}
        {message.handled && <span className="inline-flex items-center gap-1 text-success"><Check className="size-3.5" /> handled</span>}
      </header>

      <p className="text-sm font-medium">{message.question}</p>
      {message.answer && <p className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm text-muted">{message.answer}</p>}

      {canTeach && !message.handled && (
        <form action={teach} className="space-y-2 border-t border-border pt-3">
          <input type="hidden" name="botId" value={botId} />
          <input type="hidden" name="logId" value={message.id} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Your answer (the chatbot will remember it)</span>
            <textarea name="answer" required rows={3} maxLength={5000} placeholder="Write the right answer to this question…" className={inputClass} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Saving…" : "Teach this answer"}</button>
            <button
              type="button"
              className={`${secondaryButton} inline-flex items-center gap-1.5`}
              onClick={async (event) => {
                if (!(await confirmDialog({ title: "Ignore this message?", text: "It will be closed without teaching the chatbot anything (spam, off-topic...).", confirmText: "Ignore" }))) return;
                const data = new FormData();
                data.set("botId", botId);
                data.set("logId", message.id);
                await dismissAction(data);
                toast("Ignored", "info");
                void event;
              }}
            >
              <X className="size-3.5" /> Ignore
            </button>
            {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
          </div>
        </form>
      )}
    </article>
  );
}
