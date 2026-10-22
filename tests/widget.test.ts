// Runs public/widget.js inside jsdom with a fake API: start-up, streaming, safe rendering, errors, feedback.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const source = readFileSync("public/widget.js", "utf8");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

type Call = { url: string; init?: RequestInit };

function sseResponse(events: unknown[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const e of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function boot(handler: (url: string, init?: RequestInit) => Response | Promise<Response>, config: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const dom = new JSDOM(`<!doctype html><body><script src="https://bots.example.com/widget.js" data-bot="pk_test" data-open="true"></script></body>`, {
    url: "https://site.example/page",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window as unknown as Record<string, unknown> & Window;
  w.TextDecoder = TextDecoder;
  // jsdom does not set document.currentScript for outside-only scripts: point it at the tag
  Object.defineProperty(dom.window.document, "currentScript", { value: dom.window.document.querySelector("script"), configurable: true });
  const full = { enabled: true, name: "Helper", welcomeMessage: "Hello there", appearance: { color: "#ff0000", suggestions: ["What are your hours?"], ...config } };
  w.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return String(url).endsWith("/config") ? new Response(JSON.stringify(full), { status: 200 }) : handler(String(url), init);
  }) as unknown as typeof fetch;
  dom.window.eval(source);
  const shadow = () => dom.window.document.body.lastElementChild!.shadowRoot!;
  return { dom, calls, shadow };
}

test("starts from the script tag, loads the config and shows the welcome message", async () => {
  const { calls, shadow } = boot(() => new Response("{}"));
  await tick();
  assert.equal(calls[0].url, "https://bots.example.com/api/v1/bots/pk_test/config");
  const root = shadow().querySelector(".root")!;
  assert.ok(root.classList.contains("open"), "data-open opens the chat");
  assert.equal(shadow().querySelector(".title")!.textContent, "Helper");
  assert.equal(shadow().querySelector(".bubble")!.textContent, "Hello there");
  assert.equal(shadow().querySelector(".chip")!.textContent, "What are your hours?");
  assert.equal((root as HTMLElement).style.getPropertyValue("--c"), "#ff0000");
});

test("streams an answer, renders it safely and sends history and key", async () => {
  const evil = `**Hi** <img src=x onerror=alert(1)> <script>alert(2)</script> [site](https://ok.example) [bad](javascript:alert(3)) \`code\`\n- one\n- two`;
  const { calls, shadow, dom } = boot(() => sseResponse([{ type: "delta", text: evil.slice(0, 20) }, { type: "delta", text: evil.slice(20) }, { type: "done", id: "log1" }]));
  await tick();
  const input = shadow().querySelector("textarea")!;
  input.value = "hello";
  shadow().querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  await tick(80);

  const chat = calls.find((c) => c.url.endsWith("/api/v1/chat"))!;
  const headers = chat.init!.headers as Record<string, string>;
  assert.equal(headers["X-Bot-Key"], "pk_test");
  const sent = JSON.parse(String(chat.init!.body));
  assert.equal(sent.message, "hello");
  assert.equal(sent.stream, true);

  const bubbles = [...shadow().querySelectorAll(".row.bot .bubble")];
  const answer = bubbles.at(-1)!;
  assert.ok(answer.querySelector("strong")?.textContent === "Hi");
  assert.equal(answer.querySelectorAll("img, script").length, 0, "HTML in the answer is shown as text, never executed");
  assert.ok(answer.textContent!.includes("<img src=x onerror=alert(1)>"));
  const links = [...answer.querySelectorAll("a")].map((a) => a.getAttribute("href"));
  assert.deepEqual(links, ["https://ok.example"], "only http(s) links become anchors");
  assert.equal(answer.querySelectorAll("li").length, 2);
  assert.ok(shadow().querySelector(".fb"), "feedback buttons appear after the answer");
  assert.equal((shadow().querySelector(".chips") as HTMLElement).style.display, "none", "suggestions disappear after the first message");

  // feedback is sent with the log id
  (shadow().querySelector(".fb button") as HTMLButtonElement).click();
  await tick();
  const fb = calls.find((c) => c.url.endsWith("/api/v1/feedback"))!;
  assert.deepEqual(JSON.parse(String(fb.init!.body)), { id: "log1", value: 1 });
});

test("shows the API error message when the chatbot is unavailable", async () => {
  const { shadow, dom } = boot(() => new Response(JSON.stringify({ error: { code: "providers_unavailable", message: "Try again soon." } }), { status: 503 }));
  await tick();
  shadow().querySelector("textarea")!.value = "hi";
  shadow().querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  await tick(80);
  const last = [...shadow().querySelectorAll(".bubble")].at(-1)!;
  assert.equal(last.textContent, "Try again soon.");
  assert.ok(last.classList.contains("err"));
  assert.equal((shadow().querySelector("textarea") as HTMLTextAreaElement).disabled, false, "input is usable again");
});

test("does not render anything when the chatbot is disabled", async () => {
  const dom = new JSDOM(`<!doctype html><body><script src="https://bots.example.com/widget.js" data-bot="pk_test"></script></body>`, { url: "https://site.example/", runScripts: "outside-only" });
  const w = dom.window as unknown as Window & Record<string, unknown>;
  w.fetch = (async () => new Response(JSON.stringify({ enabled: false }), { status: 200 })) as unknown as typeof fetch;
  Object.defineProperty(dom.window.document, "currentScript", { value: dom.window.document.querySelector("script"), configurable: true });
  const before = dom.window.document.body.children.length;
  dom.window.eval(source);
  await tick();
  assert.equal(dom.window.document.body.children.length, before);
});
