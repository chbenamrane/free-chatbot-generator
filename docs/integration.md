# Integration

There are two ways to put a chatbot in a project: the **widget** (one line of HTML) or the **REST API** (build your own interface or call it from your server). The *Embed & API* tab of every chatbot shows ready-to-copy snippets with your real keys and address.

## 1. The widget

Add this just before `</body>` on every page that should show the chat:

```html
<script src="https://YOUR-INSTANCE/widget.js" data-bot="pk_xxxxxxxx" defer></script>
```

| Attribute | Description |
|---|---|
| `data-bot` | **Required.** The chatbot's public key (`pk_...`). |
| `data-api` | Address of the instance. Default: where `widget.js` is loaded from. |
| `data-open="true"` | Opens the chat when the page loads. |

JavaScript API: `FreeChatbot.open()`, `FreeChatbot.close()`, `FreeChatbot.toggle()` (for example to open the chat from your own "Help" button).

What it does: loads the chatbot's name, welcome message and look from the instance, shows a round button, opens a chat panel, **streams** answers, offers 👍/👎 on each answer, keeps the conversation while the tab stays open, and goes full-screen on phones. It is a single dependency-free file in a Shadow DOM: your site's CSS cannot break it and it cannot break your site.

**Security rule**: set the chatbot's **Allowed origins** (Configuration) to your website addresses, for example `https://example.com` and `https://www.example.com`. Without it, anybody can copy your public key and use your quota.

### Plain HTML, Shopify, Wix, Webflow, Squarespace...

Paste the snippet in the "custom code / footer" setting of the platform.

### WordPress

Either paste the snippet in your theme's `footer.php` before `wp_footer();` (or `</body>`), or use a plugin such as *Insert Headers and Footers* / *WPCode* and paste it in the footer section.

### Next.js (App Router)

```tsx
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://YOUR-INSTANCE/widget.js" data-bot="pk_xxxxxxxx" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

### React (Vite, CRA...)

```tsx
import { useEffect } from "react";

export function ChatWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://YOUR-INSTANCE/widget.js";
    script.dataset.bot = "pk_xxxxxxxx";
    document.body.appendChild(script);
    return () => script.remove();
  }, []);
  return null;
}
```

### Vue, Svelte, Angular, PHP, Laravel...

Anything that can output the `<script>` tag in the page layout works. There is no framework requirement.

## 2. Content Security Policy on your website

If your site sends a `Content-Security-Policy` header, allow the instance:

```
script-src  https://YOUR-INSTANCE;
connect-src https://YOUR-INSTANCE;
img-src     https://YOUR-INSTANCE https:;   (only if you use an avatar image)
style-src   'unsafe-inline';                 (the widget injects its styles in its Shadow DOM)
```

## 3. The REST API

Use the API to build a custom chat UI, a mobile app, a Slack/WhatsApp bridge, or to call a chatbot from your backend.

- **From a browser**: send the public key in the `X-Bot-Key` header. The request must come from an allowed origin.
- **From a server**: send the secret key as `Authorization: Bearer sk_...`. Never ship it in front-end code.

```bash
curl -X POST https://YOUR-INSTANCE/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_xxxxxxxx" \
  -d '{"message": "What are your opening hours?", "conversationId": "user-42"}'
```

```json
{
  "id": "cmg0x...",
  "answer": "We are open from 9 to 5, Monday to Friday.",
  "unanswered": false,
  "cached": false,
  "conversationId": "user-42"
}
```

Keep the conversation going by sending the previous turns in `history` (the API is stateless):

```json
{
  "message": "And on Saturday?",
  "history": [
    { "role": "user", "content": "What are your opening hours?" },
    { "role": "assistant", "content": "We are open from 9 to 5, Monday to Friday." }
  ]
}
```

Streaming, errors, feedback and the other endpoints are documented in [api-reference.md](api-reference.md). Node.js, Python and streaming examples are in the *Embed & API* tab.

## 4. Several projects, several chatbots

Create one chatbot per project: each has its **own keys, providers, knowledge, allowed origins and look**. Statistics can be viewed per chatbot or together on the dashboard.
