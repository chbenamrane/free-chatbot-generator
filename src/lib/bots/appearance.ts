// Look and texts of the chat widget, stored as JSON on the chatbot. Missing or invalid values fall back to the defaults,
// so an older record or a hand-edited one can never break the widget.

import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const ICONS = ["chat", "sparkles", "help"] as const;

export const appearanceSchema = z.object({
  color: color.catch("#4f46e5"), // accent color: launcher, header, visitor bubbles
  position: z.enum(["right", "left"]).catch("right"),
  theme: z.enum(["light", "dark", "auto"]).catch("auto"),
  title: z.string().trim().max(60).catch(""), // header title; empty = chatbot name
  subtitle: z.string().trim().max(100).catch(""),
  avatar: z.string().trim().max(500).catch(""), // an emoji, or an https image address; empty = initial letter
  icon: z.enum(ICONS).catch("chat"),
  placeholder: z.string().trim().max(80).catch("Type your message…"),
  launcherLabel: z.string().trim().max(40).catch(""), // text next to the round button; empty = icon only
  radius: z.number().int().min(0).max(28).catch(16),
  suggestions: z.array(z.string().trim().min(1).max(80)).max(4).catch([]), // starter questions shown above the input
  openOnLoad: z.boolean().catch(false),
  showBranding: z.boolean().catch(true),
  showReset: z.boolean().catch(false), // button that lets the visitor start the conversation over
});

export type Appearance = z.infer<typeof appearanceSchema>;

export const DEFAULT_APPEARANCE: Appearance = appearanceSchema.parse({});

export function parseAppearance(value: unknown): Appearance {
  return appearanceSchema.parse(value && typeof value === "object" ? value : {});
}

// An avatar is shown either as an emoji/text or as an image; only https images (or data from the same site) are allowed.
export const isImageAvatar = (avatar: string) => /^https:\/\//i.test(avatar);
