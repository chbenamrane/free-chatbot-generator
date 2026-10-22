"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Collapsible } from "@/components/Collapsible";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/components/form-styles";
import type { Appearance } from "@/lib/bots/appearance";
import { CUSTOM_KEYS, MAX_FIELDS, PRESET_FIELDS, publicLeadForm, type LeadField, type LeadForm } from "@/lib/bots/lead-form";
import { toast } from "@/lib/swal";
import { WidgetPreview } from "../WidgetPreview";
import { saveLeadFormAction } from "./actions";

type Props = { botId: string; publicKey: string; name: string; welcomeMessage: string; appearance: Appearance; initial: LeadForm };

const PRESET_LABELS: Record<string, string> = { name: "Name", email: "E-mail", phone: "Phone number", company: "Company" };

export function LeadFormEditor({ botId, publicKey, name, welcomeMessage, appearance, initial }: Props) {
  const [form, setForm] = useState<LeadForm>(initial);
  const [state, save, saving] = useActionState(saveLeadFormAction, undefined);

  useEffect(() => {
    if (state?.ok) toast("Form saved");
  }, [state]);

  const set = <K extends keyof LeadForm>(key: K, value: LeadForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const setField = (index: number, patch: Partial<LeadField>) => set("fields", form.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const move = (index: number, delta: number) => {
    const next = [...form.fields];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set("fields", next);
  };

  const used = new Set(form.fields.map((f) => f.key));
  const addable = [...Object.keys(PRESET_FIELDS), ...CUSTOM_KEYS].filter((key) => !used.has(key));
  const nextCustom = CUSTOM_KEYS.find((key) => !used.has(key));
  const addField = (key: string) => {
    const preset = PRESET_FIELDS[key as keyof typeof PRESET_FIELDS];
    set("fields", [...form.fields, { key, label: preset ? preset.label : "Your answer", type: preset ? preset.type : "text", required: false }]);
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <form action={save} className="space-y-5 rounded-2xl border border-border bg-surface p-5">
        <input type="hidden" name="botId" value={botId} />
        <input type="hidden" name="form" value={JSON.stringify(form)} />

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="accent-brand" />
          Ask visitors for their details
        </label>

        <fieldset className="space-y-2">
          <legend className={labelClass}>When</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="when" checked={form.when === "start"} onChange={() => set("when", "start")} className="accent-brand" />
            Before the conversation starts
          </label>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <input type="radio" name="when" checked={form.when === "after"} onChange={() => set("when", "after")} className="accent-brand" />
            Inside the conversation, after
            <input
              type="number"
              min={1}
              max={10}
              value={form.afterMessages}
              onChange={(e) => set("afterMessages", Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              disabled={form.when !== "after"}
              className={`${inputClass} !w-16 !py-1`}
              aria-label="Number of messages"
            />
            visitor message(s)
          </label>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Title</span>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={60} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Button text</span>
            <input value={form.submitLabel} onChange={(e) => set("submitLabel", e.target.value)} maxLength={30} className={inputClass} />
          </label>
        </div>
        <label className="block">
          <span className={labelClass}>Introduction</span>
          <input value={form.intro} onChange={(e) => set("intro", e.target.value)} maxLength={200} className={inputClass} />
        </label>

        <Collapsible compact defaultOpen title={`Fields (${form.fields.length}/${MAX_FIELDS})`}>
          <div className="space-y-2">
            {form.fields.length === 0 && <p className="text-xs text-muted">No field yet. Add one below.</p>}
            {form.fields.map((field, index) => {
              const custom = field.key.startsWith("custom");
              return (
                <div key={field.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                  <span className="w-20 shrink-0 text-xs text-muted">{PRESET_LABELS[field.key] ?? "Custom"}</span>
                  <input value={field.label} onChange={(e) => setField(index, { label: e.target.value })} maxLength={60} aria-label="Label shown to the visitor" className={`${inputClass} !w-auto min-w-40 flex-1 !py-1`} />
                  {custom && (
                    <select value={field.type} onChange={(e) => setField(index, { type: e.target.value as LeadField["type"] })} aria-label="Field type" className={`${inputClass} !w-auto !py-1`}>
                      <option value="text">Text</option>
                      <option value="email">E-mail</option>
                      <option value="tel">Phone</option>
                    </select>
                  )}
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={field.required} onChange={(e) => setField(index, { required: e.target.checked })} className="accent-brand" />
                    Required
                  </label>
                  <span className="ml-auto flex">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" className="rounded p-1 hover:bg-background disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === form.fields.length - 1} aria-label="Move down" className="rounded p-1 hover:bg-background disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                    <button type="button" onClick={() => set("fields", form.fields.filter((_, i) => i !== index))} aria-label="Remove field" className="rounded p-1 text-danger hover:bg-danger/10"><Trash2 className="size-3.5" /></button>
                  </span>
                </div>
              );
            })}
            {form.fields.length < MAX_FIELDS && addable.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {addable.filter((key) => !key.startsWith("custom")).map((key) => (
                  <button key={key} type="button" onClick={() => addField(key)} className={`${secondaryButton} inline-flex items-center gap-1 !text-xs`}>
                    <Plus className="size-3" /> {PRESET_LABELS[key]}
                  </button>
                ))}
                {nextCustom && (
                  <button type="button" onClick={() => addField(nextCustom)} className={`${secondaryButton} inline-flex items-center gap-1 !text-xs`}>
                    <Plus className="size-3" /> Custom question
                  </button>
                )}
              </div>
            )}
          </div>
        </Collapsible>

        <label className="block">
          <span className={labelClass}>Consent text (optional)</span>
          <input
            value={form.consentText}
            onChange={(e) => set("consentText", e.target.value)}
            maxLength={200}
            placeholder="I agree to be contacted about my request."
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-muted">When set, visitors must tick a box with this text. Recommended if you collect personal data (see the privacy notes in the documentation).</span>
        </label>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.skippable} onChange={(e) => set("skippable", e.target.checked)} className="accent-brand" />
            Let visitors skip the form
          </label>
        </div>
        <label className="block">
          <span className={labelClass}>Thank-you message (after the form)</span>
          <input value={form.thanks} onChange={(e) => set("thanks", e.target.value)} maxLength={120} className={inputClass} />
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? "Saving…" : "Save form"}</button>
          {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
        </div>
      </form>

      <div className="space-y-2 xl:sticky xl:top-6">
        <p className="text-sm font-medium">Live preview</p>
        <p className="text-xs text-muted">
          {form.enabled ? "Submitting the form here sends nothing: it only shows you the next step." : "The form is off: turn it on to preview it."}
        </p>
        <WidgetPreview publicKey={publicKey} name={name} welcomeMessage={welcomeMessage} appearance={appearance} collect={publicLeadForm(form)} />
      </div>
    </div>
  );
}
