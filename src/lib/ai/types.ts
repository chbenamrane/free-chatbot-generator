import type { Provider } from "./catalog";

// A provider ready to be called: key already decrypted, base URL resolved.
export type ActiveAi = {
  provider: Provider;
  model: string;
  apiKey: string;
  baseUrl: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };
