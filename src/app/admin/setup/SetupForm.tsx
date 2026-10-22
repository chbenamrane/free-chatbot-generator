"use client";

import { useActionState } from "react";
import { buttonClass, inputClass } from "@/components/form-styles";
import { setupAction } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-0.5 block text-xs font-medium">E-mail</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.email} className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-0.5 block text-xs font-medium">Password</span>
        <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className={inputClass} />
        <span className="mt-0.5 block text-xs text-muted">At least 12 characters.</span>
      </label>
      <label className="block text-sm">
        <span className="mb-0.5 block text-xs font-medium">Confirm password</span>
        <input name="confirm" type="password" required maxLength={128} autoComplete="new-password" className={inputClass} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating…" : "Create admin account"}
      </button>
    </form>
  );
}
