"use client";

import { useActionState, useEffect } from "react";
import { ExternalLink, FileText, Globe, HelpCircle, RefreshCw, Trash2, Upload } from "lucide-react";
import { Collapsible } from "@/components/Collapsible";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/components/form-styles";
import { confirmDelete, toast } from "@/lib/swal";
import { deleteSourceAction, refreshUrlAction, updateSourceAction } from "./actions";

export type SourceView = {
  id: string;
  type: string;
  origin: string;
  title: string;
  content: string;
  url: string | null;
  chunkCount: number;
  createdAt: string; // ISO
};

const ICONS = { text: FileText, faq: HelpCircle, url: Globe, file: Upload } as const;

export function SourceItem({ botId, source }: { botId: string; source: SourceView }) {
  const [state, save, saving] = useActionState(updateSourceAction, undefined);
  const Icon = ICONS[source.type as keyof typeof ICONS] ?? FileText;
  const [question, ...rest] = source.content.split(/\n\s*\n/);

  useEffect(() => {
    if (state?.ok) toast("Saved");
  }, [state]);

  const title = (
    <span className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted" />
      <span className="truncate">{source.title}</span>
    </span>
  );
  const aside = (
    <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted">
      {source.origin === "improvement" && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-brand">from improvement</span>}
      <span>{source.chunkCount} piece{source.chunkCount === 1 ? "" : "s"}</span>
      <span className="hidden sm:inline">{new Date(source.createdAt).toLocaleDateString("en")}</span>
    </span>
  );

  return (
    <Collapsible compact title={title} aside={aside}>
      <div className="space-y-3">
        {source.url && (
          <p className="text-xs">
            <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-brand underline">
              {source.url} <ExternalLink className="size-3 shrink-0" />
            </a>
          </p>
        )}

        <form action={save} className="space-y-3">
          <input type="hidden" name="botId" value={botId} />
          <input type="hidden" name="sourceId" value={source.id} />
          {source.type === "faq" ? (
            <>
              <label className="block">
                <span className={labelClass}>Question</span>
                <input name="question" required defaultValue={question} maxLength={500} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Answer</span>
                <textarea name="answer" required rows={4} defaultValue={rest.join("\n\n")} maxLength={5000} className={inputClass} />
              </label>
            </>
          ) : (
            <>
              <input name="title" defaultValue={source.title} maxLength={200} className={inputClass} aria-label="Title" />
              <textarea name="content" required rows={8} defaultValue={source.content} maxLength={200000} className={`${inputClass} font-mono text-xs`} aria-label="Content" />
            </>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={saving} className={primaryButton}>{saving ? "Saving…" : "Save"}</button>
            {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {source.type === "url" && (
            <form
              action={async (formData) => {
                const result = await refreshUrlAction(formData);
                if (result?.error) toast(result.error, "error");
                else toast("Page refreshed");
              }}
            >
              <input type="hidden" name="botId" value={botId} />
              <input type="hidden" name="sourceId" value={source.id} />
              <button className={`${secondaryButton} inline-flex items-center gap-1.5`}><RefreshCw className="size-3.5" /> Refresh from the web</button>
            </form>
          )}
          <form
            className="ml-auto"
            action={async (formData) => {
              if (await confirmDelete(`Forget "${source.title}"?`, "The chatbot will no longer know this.")) {
                await deleteSourceAction(formData);
                toast("Forgotten", "info");
              }
            }}
          >
            <input type="hidden" name="botId" value={botId} />
            <input type="hidden" name="sourceId" value={source.id} />
            <button className="inline-flex items-center gap-1.5 text-sm text-danger hover:underline"><Trash2 className="size-3.5" /> Delete</button>
          </form>
        </div>
      </div>
    </Collapsible>
  );
}
