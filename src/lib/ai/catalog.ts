// Supported AI providers. This file has no server-only code, so the admin pages can import it too.

export const PROVIDER_IDS = ["gemini", "groq", "openrouter", "cerebras", "mistral", "openai", "anthropic", "custom"] as const;
export type Provider = (typeof PROVIDER_IDS)[number];
export const isProvider = (v: unknown): v is Provider => PROVIDER_IDS.includes(v as Provider);

export type ProviderInfo = {
  name: string;
  tier: "free" | "paid" | "custom";
  tag: string;
  help: string;
  keyUrl?: string;
  defaultModel: string;
  // "openai": the OpenAI chat-completions protocol (all providers except Anthropic). "anthropic": the Messages API.
  protocol: "openai" | "anthropic";
  baseUrl?: string; // not set for "custom": the admin provides it
  keyOptional?: boolean; // e.g. a local Ollama server needs no key
};

export const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
  gemini: {
    name: "Google Gemini",
    tier: "free",
    tag: "Free, generous quota",
    help: "Free key from Google AI Studio. The most generous free tier.",
    keyUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-3.1-flash-lite",
    protocol: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  groq: {
    name: "Groq",
    tier: "free",
    tag: "Free, very fast",
    help: "Free key from the Groq console. Very fast, but few tokens per minute.",
    keyUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
    protocol: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  openrouter: {
    name: "OpenRouter",
    tier: "free",
    tag: "Free models (:free), limited",
    help: "Gives access to many models. Those whose name ends with \":free\" cost nothing, with a small daily allowance.",
    keyUrl: "https://openrouter.ai/settings/keys",
    defaultModel: "minimax/minimax-m2:free",
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  cerebras: {
    name: "Cerebras",
    tier: "free",
    tag: "Free, fast",
    help: "Free key from Cerebras Cloud. The list of free models changes: use \"List models\".",
    keyUrl: "https://cloud.cerebras.ai/platform",
    defaultModel: "gpt-oss-120b",
    protocol: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
  },
  mistral: {
    name: "Mistral",
    tier: "free",
    tag: "Free tier",
    help: "Key from La Plateforme (free tier, no credit card). Good in French.",
    keyUrl: "https://console.mistral.ai/api-keys",
    defaultModel: "mistral-small-latest",
    protocol: "openai",
    baseUrl: "https://api.mistral.ai/v1",
  },
  openai: {
    name: "OpenAI",
    tier: "paid",
    tag: "Paid",
    help: "Pay-as-you-go key from the OpenAI platform.",
    keyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4o-mini",
    protocol: "openai",
    baseUrl: "https://api.openai.com/v1",
  },
  anthropic: {
    name: "Anthropic (Claude)",
    tier: "paid",
    tag: "Paid",
    help: "Pay-as-you-go key from the Anthropic console.",
    keyUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-haiku-5-5",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
  },
  custom: {
    name: "Custom (OpenAI-compatible)",
    tier: "custom",
    tag: "Your own endpoint",
    help: "Any server that speaks the OpenAI chat-completions protocol: Ollama, LM Studio, vLLM, Together, DeepSeek... Enter its base URL (usually ending with /v1).",
    defaultModel: "",
    protocol: "openai",
    keyOptional: true,
  },
};
