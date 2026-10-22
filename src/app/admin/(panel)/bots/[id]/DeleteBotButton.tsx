"use client";

import { deleteBotAction } from "../actions";

export function DeleteBotButton({ botId, botName }: { botId: string; botName: string }) {
  return (
    <form
      action={deleteBotAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${botName}" and everything attached to it? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={botId} />
      <button className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/10">Delete this chatbot</button>
    </form>
  );
}
