"use client";

import { useActionState } from "react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { inputClass } from "@/components/form-styles";
import { updateBotAction } from "../actions";

type Props = {
  bot: {
    id: string;
    name: string;
    description: string;
    welcomeMessage: string;
    instructions: string;
    languages: string[];
    allowedOrigins: string[];
    enabled: boolean;
  };
};

export function BotSettingsForm({ bot }: Props) {
  const [state, action, pending] = useActionState(updateBotAction, undefined);
  return (
    <form action={action} className="space-y-5 rounded-2xl border border-border bg-surface p-6">
      <input type="hidden" name="id" value={bot.id} />
      <h2 className="font-semibold">Settings</h2>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Name</span>
        <input name="name" required maxLength={60} defaultValue={bot.name} className={inputClass} />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Description</span>
        <input name="description" maxLength={300} defaultValue={bot.description} className={inputClass} placeholder="Only visible to you" />
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Languages it answers in</legend>
        <LanguagePicker selected={bot.languages} />
        <p className="mt-1 text-xs text-muted">The bot replies in the visitor&apos;s language when it is in this list, otherwise in the first one.</p>
      </fieldset>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Welcome message</span>
        <input name="welcomeMessage" maxLength={300} defaultValue={bot.welcomeMessage} className={inputClass} placeholder="Hi! How can I help you?" />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Instructions</span>
        <textarea
          name="instructions"
          rows={5}
          maxLength={4000}
          defaultValue={bot.instructions}
          className={inputClass}
          placeholder="Tone, scope and rules. Example: You are the assistant of Acme. Be concise and friendly. Never give legal advice."
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Allowed origins</span>
        <textarea
          name="allowedOrigins"
          rows={3}
          defaultValue={bot.allowedOrigins.join("\n")}
          className={`${inputClass} font-mono`}
          placeholder={"https://example.com\nhttps://www.example.com"}
        />
        <span className="mt-1 block text-xs text-muted">
          One website per line. The widget only works on these sites. Leave empty to allow any website (not recommended in production).
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={bot.enabled} className="accent-brand" />
        Enabled (a disabled chatbot no longer answers)
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state?.ok && <span role="status" className="text-sm text-emerald-600">Saved.</span>}
        {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
