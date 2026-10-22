# AI providers

Each chatbot has its **own list of providers, keys and models**. Open a chatbot, then *Configuration → AI providers*.

## Supported providers

| Provider | Type | Where to get a key | Notes |
|---|---|---|---|
| Google Gemini | free tier | <https://aistudio.google.com/apikey> | Usually the most generous free quota. |
| Groq | free tier | <https://console.groq.com/keys> | Very fast; limited tokens per minute. |
| OpenRouter | free models | <https://openrouter.ai/settings/keys> | Models whose name ends with `:free` cost nothing; small daily allowance. |
| Cerebras | free tier | <https://cloud.cerebras.ai/platform> | Fast; the list of free models changes. |
| Mistral | free tier | <https://console.mistral.ai/api-keys> | Free tier without a credit card; good in French. |
| OpenAI | paid | <https://platform.openai.com/api-keys> | Pay as you go. |
| Anthropic (Claude) | paid | <https://console.anthropic.com/settings/keys> | Pay as you go (native Messages API). |
| Custom | any | your server | Any OpenAI-compatible endpoint: Ollama, LM Studio, vLLM, Together, DeepSeek... Enter its base URL (for example `http://localhost:11434/v1`). The key is optional. |

> Free tiers, quotas and model names change often. The app never hard-codes quotas: use **List models** to see what your key can use and **Test** to check a provider.

## Setting up a provider

1. Open the provider's card (click its name).
2. Paste the **API key** (it is encrypted before it is stored and never shown again).
3. Check the **model** (click *List models* for the real list, then pick one).
4. **Save**, then **Test**.

The round switch in the card header enables or disables the provider **without opening the card**. A provider with no key cannot be enabled.

## Order and fallback

- Providers are tried **from top to bottom**. Drag the **≡** handle to reorder (or focus it and use the up/down arrow keys).
- When a request fails, the next provider answers. The visitor never sees the failure.
- The failing provider is **paused** so the following requests skip it:

| Error | Pause |
|---|---|
| Quota reached (HTTP 429) | the `Retry-After` delay if given, otherwise 5 minutes (1 hour at most) |
| Key refused or model not found (401, 403, 404) | 15 minutes (the admin has to fix it; the message is shown on the card) |
| Outage, timeout, network failure, empty answer | 30 seconds |
| Request too long (413) | none |

- A paused provider shows a **Paused** badge and its last error. Saving the card, or flipping its switch, clears the pause.
- If **every** provider is unavailable, the API answers HTTP 503 and the message is listed in *Messages → To answer*. The dashboard warns you when a chatbot has no usable provider.
- A provider can only be switched to another **before the answer starts**. If a provider breaks in the middle of an answer, the answer ends with an error.

## Tips for staying free

- Enable **two or three** free providers: their quotas add up.
- Put the provider with the best quota first (often Gemini), a fast one second (Groq).
- Knowledge and cache keep requests low: identical first questions are answered from the **cache** without calling any AI.
- Watch *Dashboard → AI providers usage* (calls per provider, and today's calls).

## Using a local model (Ollama)

1. Install [Ollama](https://ollama.com) and pull a model, for example `ollama pull llama3.2`.
2. Add the **Custom** provider: base URL `http://localhost:11434/v1`, model `llama3.2`, no key.
3. If the app runs in Docker, use `http://host.docker.internal:11434/v1` instead.

## Where keys are stored

In the `BotProvider` table, encrypted with `APP_SECRET`. Before a key is removed, a chatbot deleted, or after a key is saved, an encrypted copy is written to `./backups`. See [security.md](security.md#api-key-protection-and-backups).
