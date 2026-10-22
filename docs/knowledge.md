# Knowledge and learning

A chatbot knows what you teach it. The **Knowledge** tab of a chatbot is where you do it.

## Ways to teach

| Type | Use it for | Notes |
|---|---|---|
| **Text** | Descriptions, policies, prices, documentation | Up to 200 000 characters per source. |
| **Q&A** | Exact answers to frequent questions | Slightly favoured when searching. |
| **Web page** | Importing an existing page | The text is imported once; use *Refresh from the web* when the page changes. Pages built only with JavaScript can come out empty. |
| **File** | `.txt`, `.md`, `.csv`, `.json`, `.html` | 1 MB at most. |

Each source can be edited or deleted. Editing re-indexes it.

## How the chatbot finds an answer

1. Sources are cut into **pieces** of about 900 characters (paragraphs are kept together).
2. For each visitor question:
   - If the **whole knowledge** is small (up to 6000 characters), **everything** is sent to the AI: nothing can be missed.
   - Otherwise the app runs a **PostgreSQL full-text search** (the `simple` configuration, so it works for any language, with prefix matching so "prices" finds "price"), keeps the best pieces that fit in 6000 characters and sends only those. Q&As are ranked 1.5 times higher.
3. The AI answers **only from this knowledge** for factual questions about your business. Greetings and small talk are fine.
4. If it cannot answer, it says so politely and the question is recorded as **unanswered**.

Use **Test what it finds** (Knowledge tab) to see which pieces a question would retrieve. If a question finds nothing, add the missing information, or a Q&A phrased the way visitors ask.

## The improvement loop

*Messages → To answer* lists:

- questions the chatbot **did not know**,
- messages that **failed** because no AI provider was available,
- answers visitors rated **not helpful** (*Not helpful* filter).

Write the right answer in the box and click **Teach this answer**: it becomes a Q&A source (marked "from improvement"), the identical pending questions are closed, and cached answers of that chatbot are invalidated. **Ignore** closes a message without teaching anything (spam, off-topic).

## The answer cache

The first question of a conversation is cached (normalized: case and punctuation do not matter). The same question later returns the stored answer **without calling the AI**. The cache of a chatbot is invalidated whenever its knowledge, name, instructions or languages change. Answers marked unanswered are never cached.

## Limits

- 500 sources per chatbot, 200 000 characters per source.
- Web import: pages up to 2 MB, `http`/`https` only, public addresses only (see `ALLOW_PRIVATE_URLS`).
- There are no embeddings: the search is lexical. It is simple, free and works everywhere; very different wording between question and knowledge can be missed, which the improvement loop fixes over time.
