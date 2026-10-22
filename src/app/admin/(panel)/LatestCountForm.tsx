"use client";

import { useActionState, useEffect } from "react";
import { inputClass, secondaryButton } from "@/components/form-styles";
import { toast } from "@/lib/swal";
import { setLatestCountAction } from "./actions";

// "Show the N latest messages": N is saved on the admin account.
export function LatestCountForm({ count }: { count: number }) {
  const [state, action, pending] = useActionState(setLatestCountAction, undefined);

  useEffect(() => {
    if (state?.ok) toast("Saved");
    if (state?.error) toast(state.error, "error");
  }, [state]);

  return (
    <form action={action} className="flex items-center gap-2 text-sm font-normal">
      <label htmlFor="latest-count" className="text-muted">Show</label>
      <input id="latest-count" name="count" type="number" min={1} max={100} defaultValue={count} className={`${inputClass} !w-20 !py-1`} />
      <button disabled={pending} className={`${secondaryButton} !py-1`}>{pending ? "…" : "Apply"}</button>
    </form>
  );
}
