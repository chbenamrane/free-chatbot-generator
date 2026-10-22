// Identifies the chatbot of an API request.
//   Authorization: Bearer sk_...   server-to-server call with the secret key (no origin rule)
//   X-Bot-Key: pk_...              browser call with the public key (only from the allowed origins)

import "server-only";
import { db } from "@/lib/db";
import { hashSecretKey } from "@/lib/bots/keys";
import { isOriginAllowed, selfOriginFrom } from "./cors";
import { ApiError } from "./http";

const botSelect = {
  id: true,
  name: true,
  enabled: true,
  languages: true,
  instructions: true,
  welcomeMessage: true,
  allowedOrigins: true,
  knowledgeVersion: true,
  appearance: true,
  collect: true,
} as const;

export type ApiBot = NonNullable<Awaited<ReturnType<typeof findByPublicKey>>>;

export const findByPublicKey = (publicKey: string) => db.bot.findUnique({ where: { publicKey }, select: botSelect });
const findBySecretHash = (secretKeyHash: string) => db.bot.findUnique({ where: { secretKeyHash }, select: botSelect });

export type ApiAuth = { bot: ApiBot; kind: "secret" | "public"; origin: string | null; originAllowed: boolean };

export async function authenticate(request: Request, publicKeyFromPath?: string): Promise<ApiAuth> {
  const origin = request.headers.get("origin");
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (bearer) {
    if (!bearer.startsWith("sk_")) throw new ApiError(401, "invalid_key", "Invalid API key.");
    const bot = await findBySecretHash(hashSecretKey(bearer));
    if (!bot) throw new ApiError(401, "invalid_key", "Invalid API key.");
    return { bot, kind: "secret", origin, originAllowed: true };
  }

  const publicKey = publicKeyFromPath ?? request.headers.get("x-bot-key");
  if (!publicKey || !publicKey.startsWith("pk_")) throw new ApiError(401, "missing_key", "Send the public key in the X-Bot-Key header, or the secret key as a Bearer token.");
  const bot = await findByPublicKey(publicKey);
  if (!bot) throw new ApiError(401, "invalid_key", "Invalid API key.");

  const selfOrigin = selfOriginFrom(request.headers, process.env.APP_URL);
  return { bot, kind: "public", origin, originAllowed: isOriginAllowed(origin, bot.allowedOrigins, selfOrigin) };
}
