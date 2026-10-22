"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secret-box";
import { PROVIDER_INFO, isProvider, type Provider } from "@/lib/ai/catalog";
import { describeAiError } from "@/lib/ai/errors";
import { collect, listModelsWith, testWith } from "@/lib/ai/engine";
import { runBotChat } from "@/lib/ai/bot-chain";
import { buildSystemPrompt } from "@/lib/chat/prompt";

export type ProviderFormState = { ok?: boolean; error?: string } | undefined;
export type ProviderCheck = { ok: boolean; message: string; models?: string[] };

function parseBaseUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString().replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}

// Reads the provider fields of a card. The key typed in the form wins; otherwise the saved one is used.
async function readCard(formData: FormData) {
  const botId = String(formData.get("botId") ?? "");
  const provider = String(formData.get("provider") ?? "");
  if (!isProvider(provider)) return null;
  const info = PROVIDER_INFO[provider];

  const row = await db.botProvider.findUnique({ where: { botId_provider: { botId, provider } } });
  const typedKey = String(formData.get("apiKey") ?? "").trim();
  const savedKey = row?.keyEnc ? decryptSecret(row.keyEnc) : null;
  const rawBase = String(formData.get("baseUrl") ?? "").trim();
  return {
    botId,
    provider: provider as Provider,
    info,
    row,
    typedKey,
    apiKey: typedKey || savedKey || "",
    model: String(formData.get("model") ?? "").trim() || info.defaultModel,
    baseUrl: provider === "custom" ? parseBaseUrl(rawBase) : info.baseUrl!,
    rawBase,
    enabled: formData.get("enabled") === "on",
  };
}

export async function saveProviderAction(_prev: ProviderFormState, formData: FormData): Promise<ProviderFormState> {
  await requireAdmin();
  const card = await readCard(formData);
  if (!card) return { error: "Unknown provider." };
  if (!(await db.bot.findUnique({ where: { id: card.botId }, select: { id: true } }))) return { error: "This chatbot no longer exists." };

  if (card.provider === "custom" && !card.baseUrl) return { error: "Enter a valid http(s) base URL." };
  if (!card.model) return { error: "Enter a model name." };
  if (card.model.length > 120) return { error: "Model name too long." };
  if (card.typedKey.length > 500) return { error: "API key too long." };
  if (card.enabled && !card.apiKey && !card.info.keyOptional) return { error: "Enter an API key before enabling this provider." };

  const data = {
    enabled: card.enabled,
    model: card.model,
    baseUrl: card.provider === "custom" ? card.baseUrl : null,
    ...(card.typedKey ? { keyEnc: encryptSecret(card.typedKey) } : {}),
    // Saving is a fresh start: forget the previous failure.
    pausedUntil: null,
    lastError: null,
  };
  if (card.row) {
    await db.botProvider.update({ where: { id: card.row.id }, data });
  } else {
    const last = await db.botProvider.aggregate({ where: { botId: card.botId }, _max: { sortOrder: true } });
    await db.botProvider.create({
      data: { botId: card.botId, provider: card.provider, sortOrder: (last._max.sortOrder ?? -1) + 1, ...data },
    });
  }
  revalidatePath(`/admin/bots/${card.botId}`);
  return { ok: true };
}

// Swaps a provider with its neighbour in the priority order.
export async function moveProviderAction(formData: FormData) {
  await requireAdmin();
  const botId = String(formData.get("botId") ?? "");
  const provider = String(formData.get("provider") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;

  const rows = await db.botProvider.findMany({ where: { botId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const index = rows.findIndex((r) => r.provider === provider);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= rows.length) return;
  [rows[index], rows[target]] = [rows[target], rows[index]];
  await db.$transaction(rows.map((r, i) => db.botProvider.update({ where: { id: r.id }, data: { sortOrder: i } })));
  revalidatePath(`/admin/bots/${botId}`);
}

export async function removeProviderAction(formData: FormData) {
  await requireAdmin();
  const botId = String(formData.get("botId") ?? "");
  await db.botProvider.deleteMany({ where: { botId, provider: String(formData.get("provider") ?? "") } });
  revalidatePath(`/admin/bots/${botId}`);
}

function checkFailure(error: unknown, provider: Provider): ProviderCheck {
  return { ok: false, message: describeAiError(error, provider) };
}

export async function testProviderAction(formData: FormData): Promise<ProviderCheck> {
  await requireAdmin();
  const card = await readCard(formData);
  if (!card) return { ok: false, message: "Unknown provider." };
  if (!card.baseUrl) return { ok: false, message: "Enter a valid http(s) base URL." };
  if (!card.apiKey && !card.info.keyOptional) return { ok: false, message: "Enter an API key first." };
  if (!card.model) return { ok: false, message: "Enter a model name." };
  try {
    await testWith({ provider: card.provider, model: card.model, apiKey: card.apiKey, baseUrl: card.baseUrl });
    return { ok: true, message: "It works." };
  } catch (error) {
    return checkFailure(error, card.provider);
  }
}

export async function listModelsAction(formData: FormData): Promise<ProviderCheck> {
  await requireAdmin();
  const card = await readCard(formData);
  if (!card) return { ok: false, message: "Unknown provider." };
  if (!card.baseUrl) return { ok: false, message: "Enter a valid http(s) base URL." };
  if (!card.apiKey && !card.info.keyOptional) return { ok: false, message: "Enter an API key first." };
  try {
    const models = await listModelsWith({ provider: card.provider, apiKey: card.apiKey, baseUrl: card.baseUrl });
    return { ok: true, message: `${models.length} models found.`, models };
  } catch (error) {
    return checkFailure(error, card.provider);
  }
}

// ---------- Playground: talk to the chatbot exactly as a visitor would ----------

export type PlaygroundState = { answer?: string; via?: string; error?: string; question?: string } | undefined;

export async function playgroundAction(_prev: PlaygroundState, formData: FormData): Promise<PlaygroundState> {
  await requireAdmin();
  const question = String(formData.get("message") ?? "").trim().slice(0, 1000);
  if (!question) return { error: "Type a message." };

  const bot = await db.bot.findUnique({ where: { id: String(formData.get("botId") ?? "") } });
  if (!bot) return { error: "This chatbot no longer exists." };

  const run = await runBotChat(bot.id, buildSystemPrompt(bot), [{ role: "user", content: question }]);
  if (!run.ok) return { error: run.error, question };
  try {
    const answer = await collect(run.stream);
    const via = `${PROVIDER_INFO[run.provider].name} · ${run.model}${run.fallback ? " (fallback)" : ""}`;
    revalidatePath(`/admin/bots/${bot.id}`); // provider status may have changed
    return { answer, via, question };
  } catch (error) {
    return { error: describeAiError(error, run.provider), question };
  }
}
