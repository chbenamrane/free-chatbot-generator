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

function boot(handler: (url: string, init?: RequestInit) => Response | Promise<Response>, config: Record<string, unknown> = {}, collect: Record<string, unknown> | null = null) {
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
  const full = { enabled: true, name: "Helper", welcomeMessage: "Hello there", appearance: { color: "#ff0000", suggestions: ["What are your hours?"], ...config }, collect };
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

const ok = () => sseResponse([{ type: "delta", text: "Sure." }, { type: "done", id: "log1" }]);

async function say(h: ReturnType<typeof boot>, text: string) {
  h.shadow().querySelector("textarea")!.value = text;
  h.shadow().querySelector(".form")!.dispatchEvent(new h.dom.window.Event("submit", { cancelable: true }));
  await tick(80);
}
const chatBodies = (calls: Call[]) => calls.filter((c) => c.url.endsWith("/api/v1/chat")).map((c) => JSON.parse(String(c.init!.body)));
const leadBodies = (calls: Call[]) => calls.filter((c) => c.url.endsWith("/api/v1/leads")).map((c) => JSON.parse(String(c.init!.body)));
const fill = (h: ReturnType<typeof boot>, values: Record<string, string>, consent?: boolean) => {
  const root = h.shadow();
  for (const [key, value] of Object.entries(values)) (root.querySelector(`.lf input[name="${key}"]`) as HTMLInputElement).value = value;
  if (consent !== undefined) (root.querySelector(".lf .consent input") as HTMLInputElement).checked = consent;
  root.querySelector(".lf")!.dispatchEvent(new h.dom.window.Event("submit", { cancelable: true }));
};

test("reset button is hidden by default and shown with showReset", async () => {
  const off = boot(ok);
  await tick();
  assert.equal((off.shadow().querySelector('[aria-label="Start a new conversation"]') as HTMLElement).style.display, "none");
  const on = boot(ok, { showReset: true });
  await tick();
  assert.equal((on.shadow().querySelector('[aria-label="Start a new conversation"]') as HTMLElement).style.display, "");
});

test("reset asks for confirmation, then clears the conversation and starts a new one", async () => {
  const h = boot(ok, { showReset: true });
  await tick();
  const resetBtn = h.shadow().querySelector('[aria-label="Start a new conversation"]') as HTMLButtonElement;
  resetBtn.click();
  assert.ok(!h.shadow().querySelector(".confirm")!.classList.contains("show"), "nothing to reset before the first message");

  await say(h, "first question");
  const firstId = chatBodies(h.calls)[0].conversationId;
  resetBtn.click();
  assert.ok(h.shadow().querySelector(".confirm")!.classList.contains("show"));
  (h.shadow().querySelectorAll(".confirm button")[0] as HTMLButtonElement).click(); // Cancel
  assert.ok(!h.shadow().querySelector(".confirm")!.classList.contains("show"));
  assert.ok(h.shadow().querySelectorAll(".row").length >= 3, "cancel keeps the conversation");

  resetBtn.click();
  (h.shadow().querySelector(".confirm .go") as HTMLButtonElement).click(); // Reset
  assert.equal(h.shadow().querySelectorAll(".row").length, 1, "only the welcome message is left");
  assert.equal(h.shadow().querySelector(".bubble")!.textContent, "Hello there");
  assert.ok(h.shadow().querySelector(".chip"), "suggestions are back");

  await say(h, "second question");
  const second = chatBodies(h.calls)[1];
  assert.deepEqual(second.history, [], "the history was cleared");
  assert.notEqual(second.conversationId, firstId, "a new conversation id is used");
});

const form = {
  enabled: true,
  when: "start",
  afterMessages: 2,
  title: "Before we start",
  intro: "Tell us about you",
  submitLabel: "Start chat",
  skippable: false,
  consentText: "",
  thanks: "Thanks!",
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "E-mail", type: "email", required: false },
  ],
};

test("start form replaces the chat until it is filled, then sends the lead and the visitor name", async () => {
  const h = boot(ok, {}, { ...form, fields: [{ key: "name", label: "<img src=x onerror=alert(1)>", type: "text", required: true }, ...form.fields.slice(1)] });
  await tick();
  assert.ok(h.shadow().querySelector(".panel")!.classList.contains("lead-mode"));
  assert.equal(h.shadow().querySelector(".lf h3")!.textContent, "Before we start");
  assert.equal(h.shadow().querySelectorAll(".lf img").length, 0, "labels are text, never HTML");

  fill(h, { name: "Marie", email: "marie@example.com" });
  await tick();
  const leads = leadBodies(h.calls);
  assert.equal(leads.length, 1);
  assert.deepEqual(leads[0].data, { name: "Marie", email: "marie@example.com" });
  assert.equal(leads[0].consent, false);
  assert.ok(!h.shadow().querySelector(".panel")!.classList.contains("lead-mode"), "the chat is available");

  await say(h, "hello");
  const chat = chatBodies(h.calls)[0];
  assert.deepEqual(chat.visitor, { name: "Marie" });
  assert.equal(chat.conversationId, leads[0].conversationId, "the lead is linked to the conversation");
});

test("a rejected submission shows the server message and keeps the form", async () => {
  const h = boot(() => new Response(JSON.stringify({ error: { code: "invalid_lead", message: "E-mail: enter a valid e-mail address." } }), { status: 400 }), {}, form);
  await tick();
  fill(h, { name: "Marie", email: "nope" });
  await tick();
  assert.equal(h.shadow().querySelector(".lf .err")!.textContent, "E-mail: enter a valid e-mail address.");
  assert.ok(h.shadow().querySelector(".panel")!.classList.contains("lead-mode"));
  assert.equal((h.shadow().querySelector(".lf .go") as HTMLButtonElement).disabled, false);
});

test("consent checkbox is sent, and skipping needs no request", async () => {
  const withConsent = boot(ok, {}, { ...form, consentText: "I agree to be contacted" });
  await tick();
  fill(withConsent, { name: "Marie" }, true);
  await tick();
  assert.equal(leadBodies(withConsent.calls)[0].consent, true);

  const skippable = boot(ok, {}, { ...form, skippable: true });
  await tick();
  (skippable.shadow().querySelector(".lf .skip") as HTMLButtonElement).click();
  assert.equal(leadBodies(skippable.calls).length, 0);
  assert.ok(!skippable.shadow().querySelector(".panel")!.classList.contains("lead-mode"));
});

test("after mode asks inside the conversation once enough messages were sent", async () => {
  const h = boot(ok, {}, { ...form, when: "after", afterMessages: 2 });
  await tick();
  assert.ok(!h.shadow().querySelector(".panel")!.classList.contains("lead-mode"), "the chat is available right away");
  await say(h, "one");
  assert.equal(h.shadow().querySelectorAll(".card").length, 0);
  await say(h, "two");
  assert.equal(h.shadow().querySelectorAll(".card .lf").length, 1, "the form appears after the second message");
  fill(h, { name: "Marie" });
  await tick();
  assert.equal(h.shadow().querySelector(".card")!.textContent, "Thanks!");
  await say(h, "three");
  assert.equal(h.shadow().querySelectorAll(".card").length, 1, "it is not asked again");
});

test("after a reset the visitor details follow the new conversation", async () => {
  const h = boot(ok, { showReset: true }, form);
  await tick();
  fill(h, { name: "Marie" });
  await tick();
  await say(h, "hello");
  (h.shadow().querySelector('[aria-label="Start a new conversation"]') as HTMLButtonElement).click();
  (h.shadow().querySelector(".confirm .go") as HTMLButtonElement).click();
  await tick();
  const leads = leadBodies(h.calls);
  assert.equal(leads.length, 2);
  assert.notEqual(leads[1].conversationId, leads[0].conversationId);
  assert.deepEqual(leads[1].data, leads[0].data);
  assert.ok(!h.shadow().querySelector(".panel")!.classList.contains("lead-mode"), "the form is not shown again");
});

test("the preview never sends visitor information", async () => {
  const dom = new JSDOM("<!doctype html><body><div id=box></div></body>", { url: "https://admin.example/", runScripts: "outside-only" });
  const w = dom.window as unknown as Window & Record<string, unknown>;
  const calls: Call[] = [];
  w.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response("{}");
  }) as unknown as typeof fetch;
  w.TextDecoder = TextDecoder;
  dom.window.eval(source);
  const FreeChatbot = (w as unknown as { FreeChatbot: { mount: (o: object) => { host: HTMLElement } } }).FreeChatbot;
  const handle = FreeChatbot.mount({ key: "pk_x", api: "https://admin.example", container: dom.window.document.getElementById("box"), appearance: {}, name: "Bot", noStore: true, open: true, collect: form });
  const root = handle.host.shadowRoot!;
  (root.querySelector('.lf input[name="name"]') as HTMLInputElement).value = "Marie";
  root.querySelector(".lf")!.dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  await tick();
  assert.equal(calls.filter((c) => c.url.includes("/leads")).length, 0);
  assert.ok(!root.querySelector(".panel")!.classList.contains("lead-mode"), "the preview still moves on to the chat");
});
