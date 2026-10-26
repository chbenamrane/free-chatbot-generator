"use client";

import { useActionState } from "react";
import { buttonClass, inputClass } from "@/components/form-styles";
import { setupAction } from "./actions";

export function SetupForm({ needsToken }: { needsToken: boolean }) {
  const [state, action, pending] = useActionState(setupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {needsToken && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Setup token</span>
          <input name="token" type="password" required autoComplete="off" className={inputClass} />
          <span className="mt-1 block text-xs text-muted">The SETUP_TOKEN value from the server environment.</span>
        </label>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">E-mail</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.email} className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password</span>
        <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className={inputClass} />
        <span className="mt-1 block text-xs text-muted">At least 12 characters.</span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Confirm password</span>
        <input name="confirm" type="password" required maxLength={128} autoComplete="new-password" className={inputClass} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating…" : "Create admin account"}
      </button>
    </form>
  );
}
