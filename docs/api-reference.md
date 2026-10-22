# API reference

Base URL: your instance, for example `https://bots.example.com`. All bodies are JSON (UTF-8). Version prefix: `/api/v1`.

## Authentication

| Key | How to send it | Use it from | Origin rule |
|---|---|---|---|
| **Public key** `pk_...` | header `X-Bot-Key: pk_...` | browsers, mobile apps | Requests carrying an `Origin` header must come from the chatbot's *Allowed origins* (empty list = any). Requests without `Origin` (servers, cURL) are accepted: the rule protects browser use only. |
| **Secret key** `sk_...` | header `Authorization: Bearer sk_...` | your servers only | none |

Calls with the secret key are not limited per visitor, and their responses include the provider details.

## `POST /api/v1/chat`

Ask a question.

Request:

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | yes | The visitor's message, 1 to 1000 characters. |
| `history` | array | no | Previous turns `[{ "role": "user" \| "assistant", "content": string (≤ 2000) }]`, 20 at most (the last 8 are used). When present, the answer cache is skipped. |
| `conversationId` | string | no | Any identifier (≤ 64 characters) to group messages in the logs. |
| `stream` | boolean | no | `true` to receive Server-Sent Events (see below). |

Response `200` (JSON):

```json
{
  "id": "cmg0x1abc",
  "answer": "We are open from 9 to 5, Monday to Friday.",
  "unanswered": false,
  "cached": false,
  "conversationId": "user-42"
}
```

| Field | Description |
|---|---|
| `id` | Id of this exchange; use it with `/api/v1/feedback`. |
| `answer` | The chatbot's reply. |
| `unanswered` | `true` when the chatbot did not have the information (the question is queued in *Messages → To answer*). |
| `cached` | `true` when the reply came from the cache (no AI call). |
| `provider`, `model`, `fallback` | **Secret-key calls only.** Which provider answered and whether it was a fallback. |

### Streaming

With `"stream": true` the response is `text/event-stream`. Each event is one line `data: {json}` followed by a blank line:

```
data: {"type":"delta","text":"We are "}

data: {"type":"delta","text":"open from 9 to 5."}

data: {"type":"done","id":"cmg0x1abc","unanswered":false,"cached":false,"conversationId":null}
```

| `type` | Fields | Meaning |
|---|---|---|
| `delta` | `text` | A piece of the answer, to append. |
| `done` | `id`, `unanswered`, `cached`, `conversationId` | The answer is complete. |
| `error` | `code`, `message` | The answer was interrupted after it started. |

Errors that happen before the answer starts (invalid key, rate limit, no provider...) are normal JSON error responses with a status code.

## `POST /api/v1/feedback`

Rate an answer.

```json
{ "id": "cmg0x1abc", "value": 1 }
```

`value`: `1` helpful, `-1` not helpful, `0` remove the rating. Not-helpful answers appear under *Messages → Not helpful*. Response: `{ "ok": true }`, or `404` if the id does not belong to this chatbot.

## `GET /api/v1/bots/{publicKey}/config`

Used by the widget. Returns the chatbot's public settings (`Cache-Control: public, max-age=30`):

```json
{
  "enabled": true,
  "name": "Support assistant",
  "welcomeMessage": "Hi! How can I help?",
  "appearance": { "color": "#4f46e5", "position": "right", "theme": "auto", "title": "", "subtitle": "", "avatar": "", "icon": "chat", "placeholder": "Type your message…", "launcherLabel": "", "radius": 16, "suggestions": [], "openOnLoad": false, "showBranding": true }
}
```

## Errors

Every error has the same shape:

```json
{ "error": { "code": "rate_limited", "message": "Too many messages. Please wait a moment." } }
```

| Status | `code` | Meaning |
|---|---|---|
| 400 | `invalid_json`, `invalid_request` | Malformed body, missing or too long `message`, bad `history`. |
| 401 | `missing_key`, `invalid_key` | No key, or an unknown key. |
| 403 | `origin_not_allowed` | The website is not in the chatbot's allowed origins. |
| 403 | `bot_disabled` | The chatbot is disabled. |
| 413 | `payload_too_large` | Body larger than 50 KB. |
| 429 | `rate_limited` | Too many requests. Wait for the number of seconds in the `Retry-After` header. |
| 503 | `providers_unavailable` | No AI provider could answer. Retry shortly (`Retry-After` is set). |
| 500 | `internal_error` | Unexpected error. |

## Limits

| Limit | Value | Setting |
|---|---|---|
| Messages per visitor (IP) and chatbot, public key | 15 per minute | `CHAT_RATE_PER_MINUTE` |
| Messages per chatbot, all callers | 300 per minute | `CHAT_BOT_RATE_PER_MINUTE` |
| Feedback per visitor | 60 per minute | |
| Message length | 1000 characters | |
| Request body | 50 KB | |

Behind a reverse proxy, make sure the visitor's IP address reaches the app (see [self-hosting.md](self-hosting.md#reverse-proxy)), otherwise all visitors share one rate limit.

## CORS

The API answers preflight (`OPTIONS`) requests and sends `Access-Control-Allow-Origin` with the caller's origin when it is allowed. Browsers can therefore call the API directly from any allowed website.
