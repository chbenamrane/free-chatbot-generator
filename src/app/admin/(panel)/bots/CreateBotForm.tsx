"use client";

import { useActionState } from "react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { inputClass, labelClass, primaryButton } from "@/components/form-styles";
import { createBotAction } from "./actions";

export function CreateBotForm() {
  const [state, action, pending] = useActionState(createBotAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className={labelClass}>Name</span>
        <input name="name" required maxLength={60} placeholder="Support assistant" className={inputClass} />
      </label>
      <fieldset>
        <legend className={labelClass}>Languages it answers in</legend>
        <LanguagePicker selected={["en"]} />
      </fieldset>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Creating…" : "Create chatbot"}
        </button>
        {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
