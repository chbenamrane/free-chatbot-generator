"use client";

import { confirmDelete } from "@/lib/swal";
import { deleteBotAction } from "../actions";

export function DeleteBotButton({ botId, botName }: { botId: string; botName: string }) {
  return (
    <form
      action={async (formData) => {
        if (await confirmDelete(`Delete "${botName}"?`, "The chatbot and everything attached to it will be deleted. This cannot be undone.")) {
          await deleteBotAction(formData);
        }
      }}
    >
      <input type="hidden" name="id" value={botId} />
      <button className="rounded-md border border-danger/40 px-2.5 py-1.5 text-sm text-danger hover:bg-danger/10">Delete this chatbot</button>
    </form>
  );
}
