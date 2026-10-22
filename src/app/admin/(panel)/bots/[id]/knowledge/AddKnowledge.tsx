"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FileText, Globe, HelpCircle, Upload } from "lucide-react";
import { inputClass, labelClass, primaryButton } from "@/components/form-styles";
import { toast } from "@/lib/swal";
import { addFaqAction, addFileAction, addTextAction, addUrlAction, type KnowledgeState } from "./actions";

type Mode = "text" | "faq" | "url" | "file";

const MODES: { id: Mode; label: string; icon: typeof FileText }[] = [
  { id: "text", label: "Text", icon: FileText },
  { id: "faq", label: "Q&A", icon: HelpCircle },
  { id: "url", label: "Web page", icon: Globe },
  { id: "file", label: "File", icon: Upload },
];

// One form: resets itself and shows a toast after a successful save.
function KnowledgeForm({ botId, action, submitLabel, children }: { botId: string; action: (prev: KnowledgeState, fd: FormData) => Promise<KnowledgeState>; submitLabel: string; children: React.ReactNode }) {
  const [state, run, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Learned");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={run} className="space-y-4">
      <input type="hidden" name="botId" value={botId} />
      {children}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Learning…" : submitLabel}</button>
        {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

export function AddKnowledge({ botId }: { botId: string }) {
  const [mode, setMode] = useState<Mode>("text");
  return (
    <div className="space-y-4">
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${mode === id ? "border-brand bg-brand/10 text-brand" : "border-border hover:bg-background"}`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {mode === "text" && (
        <KnowledgeForm botId={botId} action={addTextAction} submitLabel="Teach this text">
          <label className="block">
            <span className={labelClass}>Title</span>
            <input name="title" maxLength={200} placeholder="Opening hours" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Text</span>
            <textarea name="content" required rows={8} maxLength={200000} placeholder="Paste anything the chatbot should know: about you, your products, prices, policies…" className={inputClass} />
          </label>
        </KnowledgeForm>
      )}

      {mode === "faq" && (
        <KnowledgeForm botId={botId} action={addFaqAction} submitLabel="Add this Q&A">
          <label className="block">
            <span className={labelClass}>Question</span>
            <input name="question" required maxLength={500} placeholder="Do you offer refunds?" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Answer</span>
            <textarea name="answer" required rows={5} maxLength={5000} placeholder="Yes, within 30 days of purchase…" className={inputClass} />
          </label>
        </KnowledgeForm>
      )}

      {mode === "url" && (
        <KnowledgeForm botId={botId} action={addUrlAction} submitLabel="Read this page">
          <label className="block">
            <span className={labelClass}>Page address</span>
            <input name="url" type="url" required placeholder="https://example.com/about" className={inputClass} />
            <span className="mt-1 block text-xs text-muted">The page text is imported once. Refresh it from the list when the page changes. Pages built only with JavaScript may come out empty.</span>
          </label>
        </KnowledgeForm>
      )}

      {mode === "file" && (
        <KnowledgeForm botId={botId} action={addFileAction} submitLabel="Upload and learn">
          <label className="block">
            <span className={labelClass}>File</span>
            <input name="file" type="file" required accept=".txt,.md,.markdown,.csv,.json,.html,.htm" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1 file:text-brand-foreground`} />
            <span className="mt-1 block text-xs text-muted">.txt, .md, .csv, .json or .html, 1 MB at most.</span>
          </label>
        </KnowledgeForm>
      )}
    </div>
  );
}
