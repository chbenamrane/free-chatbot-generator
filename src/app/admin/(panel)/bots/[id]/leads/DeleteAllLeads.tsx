"use client";

import { confirmDelete, toast } from "@/lib/swal";
import { deleteAllLeadsAction } from "./actions";

export function DeleteAllLeads({ botId, count }: { botId: string; count: number }) {
  return (
    <form
      action={async (formData) => {
        if (await confirmDelete(`Delete all ${count} contacts?`, "Every collected contact of this chatbot is erased. Export them first if you need them.")) {
          await deleteAllLeadsAction(formData);
          toast("All contacts deleted", "info");
        }
      }}
    >
      <input type="hidden" name="botId" value={botId} />
      <button className="text-sm text-danger hover:underline">Delete all</button>
    </form>
  );
}
