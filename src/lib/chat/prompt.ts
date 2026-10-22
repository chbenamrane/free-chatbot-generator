// Builds the system prompt of a chatbot from its settings.
// Later phases add the knowledge base and the admin's saved answers to this prompt.

import { languageName } from "@/lib/languages";

type PromptBot = { name: string; languages: string[]; instructions: string };

export function buildSystemPrompt(bot: PromptBot): string {
  const names = bot.languages.map(languageName);
  const parts = [
    `You are "${bot.name}", a chatbot embedded in a website. You talk to the website's visitors.`,
    names.length === 1
      ? `Always answer in ${names[0]}.`
      : `You master these languages: ${names.join(", ")}. Answer in the language the visitor writes in when it is one of them; otherwise answer in ${names[0]}.`,
    "Be concise, friendly and accurate. Never invent facts: if you do not know, say so honestly.",
  ];
  if (bot.instructions) parts.push(`Instructions from the owner of this chatbot:\n${bot.instructions}`);
  return parts.join("\n\n");
}
