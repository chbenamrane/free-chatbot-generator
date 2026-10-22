// Handlers of the public API (/api/v1/*). The route files only forward to these functions, which take a Request
// and return a Response, so they can be tested without starting Next.js.

import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseAppearance } from "@/lib/bots/appearance";
import { parseLeadForm, publicLeadForm, validateLead } from "@/lib/bots/lead-form";
import { cacheKey, contentVersion } from "@/lib/chat/cache";
import { cleanVisitorName } from "@/lib/chat/prompt";
import { answerQuestion } from "@/lib/chat/respond";
import { authenticate, type ApiAuth } from "./auth";
import { corsHeaders, preflightHeaders } from "./cors";
import { ApiError, clientIp, errorResponse, json, readJson } from "./http";
import { RATE_PER_BOT, RATE_PER_VISITOR, takeRate } from "./rate-limit";

const NO_INFO = "Sorry, I do not have that information.";

const chatBody = z.object({
  message: z.string().trim().min(1, "message is required").max(1000, "message is too long (1000 characters maximum)"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(20)
    .optional(),
  conversationId: z.string().trim().max(64).optional(),
  stream: z.boolean().optional(),
  visitor: z.object({ name: z.string().max(100).optional() }).optional(), // name given in the visitor form
});

const visitorHash = (ip: string) => createHash("sha256").update(`${process.env.APP_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 16);

function cors(auth: ApiAuth, methods: string) {
  return corsHeaders(auth.origin, auth.originAllowed, methods);
}

// Wraps a handler: ApiError becomes a JSON error (with CORS headers once the chatbot is known).
async function guarded(run: () => Promise<Response>, getHeaders: () => Record<string, string>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error, getHeaders());
    console.error("API error", error);
    return errorResponse(new ApiError(500, "internal_error", "Something went wrong."), getHeaders());
  }
}

export function preflight(request: Request, methods: string) {
  return new Response(null, { status: 204, headers: preflightHeaders(request.headers.get("origin"), methods) });
}

// ---------- POST /api/v1/chat ----------

export async function chatPost(request: Request): Promise<Response> {
  let headers: Record<string, string> = {};
  return guarded(async () => {
    const auth = await authenticate(request);
    headers = cors(auth, "POST, OPTIONS");
    const { bot } = auth;
    if (!auth.originAllowed) throw new ApiError(403, "origin_not_allowed", "This website is not allowed to use this chatbot.");
    if (!bot.enabled) throw new ApiError(403, "bot_disabled", "This chatbot is disabled.");

    const parsed = chatBody.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request.");
    const { message, history = [], conversationId, stream, visitor } = parsed.data;
    const visitorName = visitor?.name ? cleanVisitorName(visitor.name) : "";

    const ip = clientIp(request.headers);
    if (auth.kind === "public" && !(await takeRate(`chat:${bot.id}:${ip}`, RATE_PER_VISITOR, 60_000))) {
      throw new ApiError(429, "rate_limited", "Too many messages. Please wait a moment.", 30);
    }
    if (!(await takeRate(`chat:${bot.id}`, RATE_PER_BOT, 60_000))) throw new ApiError(429, "rate_limited", "This chatbot is receiving too many messages. Please try again shortly.", 30);

    const started = Date.now();
    const base = { botId: bot.id, conversationId: conversationId ?? null, question: message, visitorHash: auth.kind === "public" ? visitorHash(ip) : null, origin: auth.origin };
    const version = contentVersion(bot);
    const key = cacheKey(message);
    // A cached answer is shared by everybody: never cache when the answer may use this visitor's name.
    const cacheable = history.length === 0 && !visitorName;

    // 1. Cached answer to the same first question
    if (cacheable) {
      const hit = await db.chatCache.findUnique({ where: { botId_key: { botId: bot.id, key } } });
      if (hit && hit.version === version) {
        await db.chatCache.update({ where: { botId_key: { botId: bot.id, key } }, data: { hits: { increment: 1 } } });
        const log = await db.chatLog.create({ data: { ...base, answer: hit.answer, cached: true, latencyMs: Date.now() - started } });
        return stream ? sse(headers, async function* () { yield hit.answer; }, async () => ({ id: log.id, unanswered: false, cached: true, conversationId })) : json({ id: log.id, answer: hit.answer, unanswered: false, cached: true, conversationId: conversationId ?? null }, 200, headers);
      }
    }

    // 2. Ask the AI (knowledge + provider fallback)
    const run = await answerQuestion(bot, message, history, { name: visitorName });
    if (!run.ok) {
      await db.chatLog.create({ data: { ...base, status: "busy", latencyMs: Date.now() - started } });
      throw new ApiError(503, "providers_unavailable", "The chatbot cannot answer right now. Please try again in a moment.", 30);
    }

    const finish = async (text: string, status: "ok" | "error") => {
      const answer = text.trim();
      const unanswered = run.state.unanswered;
      const final = answer || (unanswered ? NO_INFO : "");
      const log = await db.chatLog.create({
        data: { ...base, answer: final, status, provider: run.provider, model: run.model, fallback: run.fallback, unanswered, latencyMs: Date.now() - started },
      });
      if (status === "ok" && cacheable && final && !unanswered) {
        await db.chatCache.upsert({
          where: { botId_key: { botId: bot.id, key } },
          create: { botId: bot.id, key, answer: final, version },
          update: { answer: final, version, hits: 0, createdAt: new Date() },
        });
      }
      const meta = auth.kind === "secret" ? { provider: run.provider, model: run.model, fallback: run.fallback } : {};
      return { id: log.id, answer: final, unanswered, cached: false, conversationId: conversationId ?? null, ...meta };
    };

    if (stream) {
      let collected = "";
      return sse(
        headers,
        async function* () {
          for await (const piece of run.stream) {
            collected += piece;
            yield piece;
          }
        },
        async (failed) => {
          const { answer: _answer, ...rest } = await finish(collected, failed ? "error" : "ok");
          void _answer;
          return rest;
        },
      );
    }

    let text = "";
    try {
      for await (const piece of run.stream) text += piece;
    } catch {
      await finish(text, "error");
      throw new ApiError(503, "providers_unavailable", "The chatbot was interrupted. Please try again.", 5);
    }
    return json(await finish(text, "ok"), 200, headers);
  }, () => headers);
}

// Server-Sent Events: {"type":"delta","text":"..."} ... then {"type":"done", ...} (or {"type":"error", ...}).
function sse(headers: Record<string, string>, source: () => AsyncGenerator<string>, onEnd: (failed: boolean) => Promise<Record<string, unknown>>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      let failed = false;
      try {
        for await (const text of source()) send({ type: "delta", text });
      } catch {
        failed = true;
      }
      try {
        const final = await onEnd(failed);
        send(failed ? { type: "error", code: "interrupted", message: "The chatbot was interrupted. Please try again.", ...final } : { type: "done", ...final });
      } catch (error) {
        console.error("API stream end error", error);
        send({ type: "error", code: "internal_error", message: "Something went wrong." });
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}

// ---------- GET /api/v1/bots/{publicKey}/config ----------

export async function configGet(request: Request, publicKey: string): Promise<Response> {
  let headers: Record<string, string> = {};
  return guarded(async () => {
    const auth = await authenticate(request, publicKey);
    headers = cors(auth, "GET, OPTIONS");
    if (!auth.originAllowed) throw new ApiError(403, "origin_not_allowed", "This website is not allowed to use this chatbot.");
    const { bot } = auth;
    return json(
      { enabled: bot.enabled, name: bot.name, welcomeMessage: bot.welcomeMessage, appearance: parseAppearance(bot.appearance), collect: publicLeadForm(parseLeadForm(bot.collect)) },
      200,
      { ...headers, "Cache-Control": "public, max-age=30" },
    );
  }, () => headers);
}

// ---------- POST /api/v1/feedback ----------

const feedbackBody = z.object({ id: z.string().min(1).max(64), value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) });

export async function feedbackPost(request: Request): Promise<Response> {
  let headers: Record<string, string> = {};
  return guarded(async () => {
    const auth = await authenticate(request);
    headers = cors(auth, "POST, OPTIONS");
    if (!auth.originAllowed) throw new ApiError(403, "origin_not_allowed", "This website is not allowed to use this chatbot.");
    const parsed = feedbackBody.safeParse(await readJson(request, 2_000));
    if (!parsed.success) throw new ApiError(400, "invalid_request", "Send { id, value } with value 1, -1 or 0.");
    if (auth.kind === "public" && !(await takeRate(`feedback:${auth.bot.id}:${clientIp(request.headers)}`, 60, 60_000))) {
      throw new ApiError(429, "rate_limited", "Too many requests.", 30);
    }
    const { count } = await db.chatLog.updateMany({ where: { id: parsed.data.id, botId: auth.bot.id }, data: { feedback: parsed.data.value } });
    if (count === 0) throw new ApiError(404, "not_found", "Message not found.");
    return json({ ok: true }, 200, headers);
  }, () => headers);
}

// ---------- POST /api/v1/leads ----------

const leadBody = z.object({ conversationId: z.string().trim().min(1).max(64), data: z.record(z.string(), z.unknown()), consent: z.boolean().optional() });

// Saves (or updates) what a visitor typed in the information form, validated against the form of that chatbot.
export async function leadPost(request: Request): Promise<Response> {
  let headers: Record<string, string> = {};
  return guarded(async () => {
    const auth = await authenticate(request);
    headers = cors(auth, "POST, OPTIONS");
    if (!auth.originAllowed) throw new ApiError(403, "origin_not_allowed", "This website is not allowed to use this chatbot.");
    if (!auth.bot.enabled) throw new ApiError(403, "bot_disabled", "This chatbot is disabled.");

    const parsed = leadBody.safeParse(await readJson(request, 10_000));
    if (!parsed.success) throw new ApiError(400, "invalid_request", "Send { conversationId, data, consent }.");
    const ip = clientIp(request.headers);
    if (auth.kind === "public" && !(await takeRate(`lead:${auth.bot.id}:${ip}`, 10, 60_000))) throw new ApiError(429, "rate_limited", "Too many requests.", 30);

    const result = validateLead(parseLeadForm(auth.bot.collect), parsed.data.data, parsed.data.consent);
    if (!result.ok) throw new ApiError(400, "invalid_lead", result.message);

    const botId = auth.bot.id;
    const conversationId = parsed.data.conversationId;
    const info = { data: result.data, consent: result.consent, origin: auth.origin, visitorHash: auth.kind === "public" ? visitorHash(ip) : null };
    await db.lead.upsert({ where: { botId_conversationId: { botId, conversationId } }, create: { botId, conversationId, ...info }, update: info });
    return json({ ok: true }, 200, headers);
  }, () => headers);
}
