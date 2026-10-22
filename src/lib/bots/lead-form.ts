// The "visitor information" form of a chatbot (name, e-mail, phone...), stored as JSON on the chatbot.
// Invalid or missing values fall back to defaults so the widget can never be broken by a bad record.
// The server validates every submission against this configuration: the browser is never trusted.

import { z } from "zod";

export const FIELD_TYPES = ["text", "email", "tel"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

// Ready-made fields. Custom fields use the keys custom1, custom2, custom3.
export const PRESET_FIELDS = {
  name: { label: "Your name", type: "text" },
  email: { label: "Your e-mail", type: "email" },
  phone: { label: "Your phone number", type: "tel" },
  company: { label: "Your company", type: "text" },
} as const satisfies Record<string, { label: string; type: FieldType }>;

export const CUSTOM_KEYS = ["custom1", "custom2", "custom3"] as const;
export const MAX_FIELDS = 6;
export const MAX_VALUE_LENGTH = 200;

const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9]{0,23}$/),
  label: z.string().trim().min(1).max(60),
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
});
export type LeadField = z.infer<typeof fieldSchema>;

const DEFAULT_FIELDS: LeadField[] = [
  { key: "name", label: PRESET_FIELDS.name.label, type: "text", required: true },
  { key: "email", label: PRESET_FIELDS.email.label, type: "email", required: true },
];

export const leadFormSchema = z.object({
  enabled: z.boolean().catch(false),
  when: z.enum(["start", "after"]).catch("start"), // before the first message, or inline after a few messages
  afterMessages: z.number().int().min(1).max(10).catch(2),
  title: z.string().trim().max(60).catch("Before we start"),
  intro: z.string().trim().max(200).catch("Tell us a little about you so we can help you better."),
  submitLabel: z.string().trim().max(30).catch("Start chat"),
  skippable: z.boolean().catch(false), // lets the visitor continue without filling the form
  consentText: z.string().trim().max(200).catch(""), // when set, a checkbox with this text must be ticked
  thanks: z.string().trim().max(120).catch("Thank you!"),
  fields: z
    .array(fieldSchema)
    .max(MAX_FIELDS)
    .catch(DEFAULT_FIELDS)
    .transform((fields) => fields.filter((f, i) => fields.findIndex((g) => g.key === f.key) === i)), // unique keys
});

export type LeadForm = z.infer<typeof leadFormSchema>;

export const DEFAULT_LEAD_FORM: LeadForm = leadFormSchema.parse({});

export function parseLeadForm(value: unknown): LeadForm {
  return leadFormSchema.parse(value && typeof value === "object" ? value : {});
}

// What the public config endpoint exposes: nothing when the form is off.
export function publicLeadForm(form: LeadForm): LeadForm | null {
  return form.enabled && form.fields.length > 0 ? form : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s.-]{6,25}$/;

export type LeadValidation = { ok: true; data: Record<string, string>; consent: boolean } | { ok: false; message: string; key?: string };

// Checks a submission against the chatbot's form. Only configured fields are kept.
export function validateLead(form: LeadForm, input: unknown, consent: unknown): LeadValidation {
  if (!form.enabled || form.fields.length === 0) return { ok: false, message: "This chatbot does not collect visitor information." };
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const data: Record<string, string> = {};

  for (const field of form.fields) {
    const value = typeof raw[field.key] === "string" ? (raw[field.key] as string).replace(/[\u0000-\u001f\u007f]/g, " ").trim() : "";
    if (!value) {
      if (field.required) return { ok: false, key: field.key, message: `${field.label} is required.` };
      continue;
    }
    if (value.length > (field.type === "email" ? 254 : MAX_VALUE_LENGTH)) return { ok: false, key: field.key, message: `${field.label} is too long.` };
    if (field.type === "email" && !EMAIL.test(value)) return { ok: false, key: field.key, message: `${field.label}: enter a valid e-mail address.` };
    if (field.type === "tel" && (!PHONE.test(value) || value.replace(/\D/g, "").length < 6)) return { ok: false, key: field.key, message: `${field.label}: enter a valid phone number.` };
    data[field.key] = value;
  }

  if (form.consentText && consent !== true) return { ok: false, message: "Please accept the consent box to continue." };
  if (Object.keys(data).length === 0) return { ok: false, message: "Fill in at least one field." };
  return { ok: true, data, consent: consent === true };
}

// Strict check of a form coming from the admin editor (the lenient parseLeadForm would silently replace a bad field list
// with the defaults). Returns a readable message for the first problem.
export function checkLeadFormInput(raw: unknown): { ok: true; form: LeadForm } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object") return { ok: false, message: "Invalid form data." };
  const fields = (raw as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return { ok: false, message: "Invalid form data." };
  if (fields.length > MAX_FIELDS) return { ok: false, message: `A form can have ${MAX_FIELDS} fields at most.` };

  const allowed: string[] = [...Object.keys(PRESET_FIELDS), ...CUSTOM_KEYS];
  const seen = new Set<string>();
  for (const field of fields) {
    const parsed = fieldSchema.safeParse(field);
    if (!parsed.success) return { ok: false, message: "Every field needs a label (60 characters at most)." };
    if (!allowed.includes(parsed.data.key)) return { ok: false, message: `Unknown field "${parsed.data.key}".` };
    if (seen.has(parsed.data.key)) return { ok: false, message: "Each field can only be used once." };
    seen.add(parsed.data.key);
    const preset = PRESET_FIELDS[parsed.data.key as keyof typeof PRESET_FIELDS];
    if (preset && preset.type !== parsed.data.type) return { ok: false, message: `The type of "${parsed.data.key}" cannot be changed.` };
  }
  const form = parseLeadForm(raw);
  if (form.enabled && form.fields.length === 0) return { ok: false, message: "Add at least one field, or turn the form off." };
  return { ok: true, form };
}
