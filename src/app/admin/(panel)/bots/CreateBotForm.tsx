"use client";

import { useActionState } from "react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { inputClass } from "@/components/form-styles";
import { createBotAction } from "./actions";

export function CreateBotForm() {
  const [state, action, pending] = useActionState(createBotAction, undefined);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-semibold">New chatbot</h2>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Name</span>
        <input name="name" required maxLength={60} placeholder="Support assistant" className={inputClass} />
      </label>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Languages it answers in</legend>
        <LanguagePicker selected={["en"]} />
      </fieldset>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create chatbot"}
      </button>
    </form>
  );
}
