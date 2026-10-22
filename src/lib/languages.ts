// Languages a chatbot can be configured to answer in. Used by the admin form and by the prompt builder.
// The AI models handle far more languages than listed here; this list only drives the picker.

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "ar", name: "Arabic" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "tr", name: "Turkish" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "uk", name: "Ukrainian" },
  { code: "he", name: "Hebrew" },
] as const;

export const LANGUAGE_CODES: string[] = LANGUAGES.map((l) => l.code);

export const languageName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;
