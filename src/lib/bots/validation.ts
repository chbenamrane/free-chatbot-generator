// Validation of chatbot settings coming from the admin forms.

import { z } from "zod";
import { LANGUAGE_CODES } from "@/lib/languages";

// Turns lines such as "https://example.com/some/page" into the bare origin "https://example.com".
// Returns null when a line is not a valid http(s) address.
export function parseOrigins(raw: string): string[] | null {
  const origins = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const value = line.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      origins.add(url.origin);
    } catch {
      return null;
    }
  }
  return origins.size > 20 ? null : [...origins];
}

const languagesSchema = z
  .array(z.string())
  .transform((list) => [...new Set(list)].filter((c) => LANGUAGE_CODES.includes(c)))
  .refine((list) => list.length > 0, "Pick at least one language.");

export const createBotSchema = z.object({
  name: z.string().trim().min(1, "Give the chatbot a name.").max(60),
  languages: languagesSchema,
});

export const updateBotSchema = z.object({
  name: z.string().trim().min(1, "Give the chatbot a name.").max(60),
  description: z.string().trim().max(300),
  welcomeMessage: z.string().trim().max(300),
  instructions: z.string().trim().max(4000),
  languages: languagesSchema,
});

export function slugify(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "bot";
}
