"use client";

import { useActionState } from "react";
import { buttonClass, inputClass } from "@/components/form-styles";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-0.5 block text-xs font-medium">E-mail</span>
        <input name="email" type="email" required autoComplete="username" defaultValue={state?.email} className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-0.5 block text-xs font-medium">Password</span>
        <input name="password" type="password" required maxLength={128} autoComplete="current-password" className={inputClass} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
