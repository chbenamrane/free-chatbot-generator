import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Collapsible } from "@/components/Collapsible";
import { CopyBlock } from "@/components/CopyBlock";
import { getBaseUrl } from "@/lib/base-url";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Embed & API" };

export default async function EmbedPage({ params }: PageProps<"/admin/bots/[id]/embed">) {
  await requireAdmin();
  await connection();
  const { id } = await params;
  const bot = await db.bot.findUnique({ where: { id }, select: { id: true, publicKey: true, secretKeyHint: true, allowedOrigins: true } });
  if (!bot) notFound();
  const base = await getBaseUrl();
  const pk = bot.publicKey;
  const isLocal = /localhost|127\.0\.0\.1/.test(base);

  const html = `<script src="${base}/widget.js" data-bot="${pk}" defer></script>`;

  const next = `// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="${base}/widget.js" data-bot="${pk}" strategy="afterInteractive" />
      </body>
    </html>
  );
}`;

  const react = `// Any React app (Vite, CRA...): load the script once, for example in App.tsx
import { useEffect } from "react";

export function ChatWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${base}/widget.js";
    script.dataset.bot = "${pk}";
    document.body.appendChild(script);
    return () => script.remove();
  }, []);
  return null;
}`;

  const curlPublic = `curl -X POST ${base}/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "X-Bot-Key: ${pk}" \\
  -d '{"message": "What are your opening hours?"}'`;

  const curlSecret = `curl -X POST ${base}/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_YOUR_SECRET_KEY" \\
  -d '{"message": "What are your opening hours?", "conversationId": "user-42"}'`;

  const node = `// Node.js 18+ (server side: keep the secret key in an environment variable)
const res = await fetch("${base}/api/v1/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${process.env.CHATBOT_SECRET_KEY}\`,
  },
  body: JSON.stringify({
    message: "What are your opening hours?",
    history: [], // optional: previous turns [{ role: "user" | "assistant", content }]
  }),
});
const data = await res.json();
console.log(data.answer, data.unanswered);`;

  const stream = `// Streaming (Server-Sent Events): show the answer while it is written
const res = await fetch("${base}/api/v1/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Bot-Key": "${pk}" },
  body: JSON.stringify({ message: "Tell me about your services", stream: true }),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\\n\\n");
  buffer = events.pop();
  for (const event of events) {
    const data = JSON.parse(event.replace(/^data: /, ""));
    if (data.type === "delta") process.stdout.write(data.text);
    if (data.type === "done") console.log("\\nmessage id:", data.id);
  }
}`;

  const python = `# Python (requests)
import os, requests

r = requests.post(
    "${base}/api/v1/chat",
    headers={"Authorization": f"Bearer {os.environ['CHATBOT_SECRET_KEY']}"},
    json={"message": "What are your opening hours?"},
    timeout=60,
)
print(r.json()["answer"])`;

  const response = `{
  "id": "cmg0x...",          // use it for POST /api/v1/feedback
  "answer": "We are open from 9 to 5, Monday to Friday.",
  "unanswered": false,       // true when the chatbot did not have the information
  "cached": false,
  "conversationId": "user-42"
}`;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        <Collapsible title="Add the chat to a website" defaultOpen>
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Paste this line just before <code className="rounded bg-background px-1">&lt;/body&gt;</code> on every page where the chat should appear. That is all.
            </p>
            <CopyBlock code={html} label="HTML, WordPress, Shopify, Wix, any website" />
            {isLocal && (
              <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                This instance is reachable at <code>{base}</code>, so websites on other computers cannot load it. Deploy it (see the self-hosting guide) or set <code>APP_URL</code> to its public address.
              </p>
            )}
            {bot.allowedOrigins.length === 0 ? (
              <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                No allowed origin is set: any website can use this public key. Restrict it in{" "}
                <Link href={`/admin/bots/${bot.id}`} className="underline">Configuration</Link>.
              </p>
            ) : (
              <p className="text-xs text-muted">Allowed websites: {bot.allowedOrigins.join(", ")}</p>
            )}
            <p className="text-xs text-muted">
              Options on the script tag: <code>data-open=&quot;true&quot;</code> opens the chat on load, <code>data-api=&quot;https://…&quot;</code> sets the instance address.
              From JavaScript: <code>FreeChatbot.open()</code>, <code>.close()</code>, <code>.toggle()</code>.
            </p>
          </div>
        </Collapsible>

        <Collapsible title="Frameworks">
          <div className="space-y-4">
            <CopyBlock code={next} label="Next.js (App Router)" />
            <CopyBlock code={react} label="React" />
            <p className="text-xs text-muted">
              WordPress: paste the HTML line in your theme&apos;s <code>footer.php</code> before <code>wp_footer()</code>, or in a plugin such as &quot;Insert Headers and Footers&quot;.
            </p>
          </div>
        </Collapsible>
      </div>

      <div className="space-y-5">
        <Collapsible title="REST API" defaultOpen>
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Use the API to build your own interface or to call the chatbot from your server. The <strong>public key</strong> (<code>{pk}</code>) is for browsers and is limited to the
              allowed origins. The <strong>secret key</strong> {bot.secretKeyHint ? <>(<code>sk_…{bot.secretKeyHint}</code>)</> : "(not generated yet)"} is for servers only: create it in{" "}
              <Link href={`/admin/bots/${bot.id}`} className="underline">Configuration → API keys</Link>.
            </p>
            <CopyBlock code={curlPublic} label="With the public key" />
            <CopyBlock code={curlSecret} label="With the secret key (server to server)" />
            <CopyBlock code={response} label="Response" />
            <CopyBlock code={node} label="Node.js" />
            <CopyBlock code={python} label="Python" />
            <CopyBlock code={stream} label="Streaming" />
          </div>
        </Collapsible>

        <Collapsible title="Endpoints and limits">
          <div className="space-y-2 text-sm">
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li><code>POST /api/v1/chat</code>: <code>{"{ message, history?, conversationId?, stream? }"}</code> (1000 characters per message, 20 history turns).</li>
              <li><code>POST /api/v1/feedback</code>: <code>{"{ id, value }"}</code> with value 1, -1 or 0.</li>
              <li><code>POST /api/v1/leads</code>: <code>{"{ conversationId, data, consent }"}</code> saves the visitor information form (when it is enabled).</li>
              <li><code>GET /api/v1/bots/{"{publicKey}"}/config</code>: name, welcome message and appearance.</li>
              <li>Errors: <code>{`{ "error": { "code", "message" } }`}</code> with status 400, 401, 403, 429 (see <code>Retry-After</code>) or 503.</li>
              <li>Limits: 15 messages per minute per visitor and chatbot (public key), 300 per minute per chatbot. Configurable with <code>CHAT_RATE_PER_MINUTE</code> and <code>CHAT_BOT_RATE_PER_MINUTE</code>.</li>
            </ul>
            <p className="text-xs text-muted">Full reference: <code>docs/api-reference.md</code> in the repository.</p>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
