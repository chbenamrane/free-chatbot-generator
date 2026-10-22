/*!
 * Free Chatbot Generator - chat widget
 * https://github.com/chbenamrane/free-chatbot-generator  (MIT)
 *
 * Usage:   <script src="https://YOUR-INSTANCE/widget.js" data-bot="pk_xxx" defer></script>
 * Options: data-api="https://YOUR-INSTANCE"   (default: the origin the script is loaded from)
 *          data-open="true"                    (open the chat on load)
 * API:     window.FreeChatbot.open() / close() / toggle()
 *
 * No dependency. Everything lives in a Shadow DOM so the host page's CSS cannot break it (and vice versa).
 * Visitor text is never inserted as HTML: it is rendered with DOM nodes only.
 */
(function () {
  "use strict";
  if (window.FreeChatbot && window.FreeChatbot.__loaded) return;

  // currentScript is set while the tag executes; the query is a fallback for loaders that run the script differently.
  var script = document.currentScript || document.querySelector('script[data-bot][src*="widget.js"]');
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ICONS = {
    chat: "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    sparkles: "M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16.5l-1.9-5.6L4.5 9l5.6-1.4L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z",
    help: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 16h-2v-2h2v2zm1.1-5.2l-.9.9c-.5.5-.7.9-.7 1.8h-2v-.5c0-.9.3-1.7.9-2.3l1.2-1.2c.3-.3.5-.7.5-1.2 0-1-.8-1.8-1.8-1.8S9.5 9.3 9.5 10.3h-2a3.8 3.8 0 1 1 6.6 2.5z",
    send: "M2 21l21-9L2 3v7l15 2-15 2z",
    close: "M6 6l12 12M18 6L6 18",
    up: "M7 11l5-8 5 8h-3v8h-4v-8H7z",
  };

  var DEFAULTS = { color: "#4f46e5", position: "right", theme: "auto", title: "", subtitle: "", avatar: "", icon: "chat", placeholder: "Type your message…", launcherLabel: "", radius: 16, suggestions: [], openOnLoad: false, showBranding: true };

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) for (var k in props) {
      if (k === "class") node.className = props[k];
      else if (k === "text") node.textContent = props[k];
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), props[k]);
      else node.setAttribute(k, props[k]);
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function icon(name, size) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size || 24);
    svg.setAttribute("height", size || 24);
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    if (name === "close") { path.setAttribute("fill", "none"); path.setAttribute("stroke", "currentColor"); path.setAttribute("stroke-width", "2.4"); path.setAttribute("stroke-linecap", "round"); }
    else path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }

  // ---- safe rendering of a message: **bold**, `code`, [text](https://link), bare links, "- " bullets, line breaks
  var INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;
  function renderInline(parent, text) {
    var last = 0, m;
    INLINE.lastIndex = 0;
    while ((m = INLINE.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var t = m[0];
      if (t.slice(0, 2) === "**") parent.appendChild(el("strong", { text: t.slice(2, -2) }));
      else if (t[0] === "`") parent.appendChild(el("code", { text: t.slice(1, -1) }));
      else if (t[0] === "[") { var i = t.indexOf("]("); parent.appendChild(link(t.slice(i + 2, -1), t.slice(1, i))); }
      else parent.appendChild(link(t, t));
      last = m.index + t.length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function link(href, label) {
    return el("a", { href: href, target: "_blank", rel: "noopener noreferrer nofollow", text: label });
  }
  function renderText(container, text) {
    container.textContent = "";
    var list = null;
    text.split("\n").forEach(function (line, index) {
      var bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      if (bullet) {
        if (!list) { list = el("ul"); container.appendChild(list); }
        var li = el("li"); renderInline(li, bullet[1]); list.appendChild(li);
        return;
      }
      list = null;
      if (index > 0 && container.lastChild && container.lastChild.nodeName !== "UL") container.appendChild(el("br"));
      renderInline(container, line);
    });
  }

  var CSS = [
    ":host{all:initial}",
    "*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
    ".root{--c:#4f46e5;--r:16px;--bg:#fff;--fg:#0f172a;--muted:#64748b;--line:#e2e8f0;--bubble:#f1f5f9;position:fixed;bottom:20px;z-index:2147483000;color:var(--fg);font-size:14px;line-height:1.45}",
    ".root.right{right:20px}.root.left{left:20px}",
    ".root.dark{--bg:#111827;--fg:#e5e7eb;--muted:#9ca3af;--line:#1f2937;--bubble:#1f2937}",
    ".root.inline{position:static;display:block}",
    ".launcher{display:flex;align-items:center;gap:8px;border:0;cursor:pointer;background:var(--c);color:#fff;border-radius:999px;height:56px;min-width:56px;padding:0 16px;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:14px;font-weight:600}",
    ".launcher:hover{filter:brightness(1.08)}.launcher:focus-visible,.btn:focus-visible,.chip:focus-visible{outline:2px solid var(--c);outline-offset:2px}",
    ".panel{position:absolute;bottom:68px;width:380px;max-width:calc(100vw - 24px);height:min(640px,calc(100vh - 110px));display:none;flex-direction:column;background:var(--bg);border:1px solid var(--line);border-radius:var(--r);box-shadow:0 18px 50px rgba(0,0,0,.3);overflow:hidden}",
    ".right .panel{right:0}.left .panel{left:0}.open .panel{display:flex}",
    ".inline .panel{position:static;display:flex;width:100%;max-width:none;height:560px;box-shadow:none}",
    ".head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--c);color:#fff}",
    ".avatar{flex:none;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;overflow:hidden}",
    ".avatar img{width:100%;height:100%;object-fit:cover}",
    ".titles{flex:1;min-width:0}.title{font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.subtitle{font-size:12px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".btn{border:0;background:transparent;color:inherit;cursor:pointer;border-radius:8px;padding:6px;display:flex}.btn:hover{background:rgba(127,127,127,.18)}",
    ".msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}",
    ".row{display:flex;flex-direction:column;max-width:86%}.row.me{align-self:flex-end;align-items:flex-end}.row.bot{align-self:flex-start}",
    ".bubble{padding:9px 12px;border-radius:calc(var(--r) - 4px);overflow-wrap:anywhere}",
    ".me .bubble{background:var(--c);color:#fff;border-bottom-right-radius:4px}.bot .bubble{background:var(--bubble);border-bottom-left-radius:4px}",
    ".bubble a{color:inherit;text-decoration:underline}.bubble code{background:rgba(127,127,127,.2);padding:1px 4px;border-radius:4px;font-family:ui-monospace,monospace;font-size:12.5px}.bubble ul{margin:4px 0;padding-left:18px}",
    ".bubble.err{background:#fee2e2;color:#991b1b}.dark .bubble.err{background:#451a1a;color:#fecaca}",
    ".fb{display:flex;gap:2px;margin-top:3px}.fb button{border:0;background:transparent;cursor:pointer;opacity:.45;font-size:13px;padding:2px 5px;border-radius:6px}.fb button:hover,.fb button.on{opacity:1;background:rgba(127,127,127,.18)}",
    ".dots{display:inline-flex;gap:4px;padding:4px 0}.dots i{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:b 1.2s infinite ease-in-out}.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}",
    "@keyframes b{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}",
    ".chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 8px}.chip{border:1px solid var(--c);color:var(--c);background:transparent;border-radius:999px;padding:5px 11px;font-size:13px;cursor:pointer}.chip:hover{background:var(--c);color:#fff}",
    ".form{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid var(--line)}",
    ".form textarea{flex:1;resize:none;max-height:110px;min-height:38px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:calc(var(--r) - 4px);padding:8px 10px;font-size:14px;outline:none}.form textarea:focus{border-color:var(--c)}",
    ".send{flex:none;width:38px;height:38px;border:0;border-radius:50%;background:var(--c);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}.send:disabled{opacity:.45;cursor:default}",
    ".brand{text-align:center;font-size:11px;color:var(--muted);padding:0 0 8px}.brand a{color:inherit}",
    "@media (max-width:480px){.root:not(.inline) .panel{position:fixed;inset:0;width:100%;max-width:none;height:100%;border-radius:0;border:0}.root:not(.inline).open .launcher{display:none}}",
    "@media (prefers-reduced-motion:reduce){.msgs{scroll-behavior:auto}.dots i{animation:none}}",
  ].join("");

  function Widget(opts) {
    this.key = opts.key;
    this.api = (opts.api || "").replace(/\/+$/, "");
    this.inline = !!opts.container;
    this.cfg = Object.assign({}, DEFAULTS, opts.appearance || {});
    this.name = opts.name || "Assistant";
    this.welcome = opts.welcome || "";
    this.history = [];
    this.busy = false;
    this.storeKey = "fcg:" + this.key;
    this.conversationId = null;
    this.hasUserMessage = false;
    this.build(opts.container);
    if (!opts.noStore) this.restore();
    if (!this.msgs.children.length && this.welcome) this.addBot(this.welcome, null, true);
    this.apply();
    if (this.cfg.openOnLoad || opts.open) this.open();
  }

  Widget.prototype.build = function (container) {
    var self = this;
    this.host = el("div");
    var shadow = this.host.attachShadow({ mode: "open" });
    shadow.appendChild(el("style", { text: CSS }));
    this.root = el("div", { class: "root" });
    this.launcher = el("button", { class: "launcher", type: "button", "aria-label": "Open chat", "aria-expanded": "false", onclick: function () { self.toggle(); } });
    this.panel = el("section", { class: "panel", role: "dialog", "aria-label": "Chat" });
    this.avatarEl = el("div", { class: "avatar" });
    this.titleEl = el("div", { class: "title" });
    this.subtitleEl = el("div", { class: "subtitle" });
    var closeBtn = el("button", { class: "btn", type: "button", "aria-label": "Close chat", onclick: function () { self.close(); } }, [icon("close", 20)]);
    var head = el("div", { class: "head" }, [this.avatarEl, el("div", { class: "titles" }, [this.titleEl, this.subtitleEl]), this.inline ? null : closeBtn]);
    this.msgs = el("div", { class: "msgs", "aria-live": "polite" });
    this.chips = el("div", { class: "chips" });
    this.input = el("textarea", { rows: "1", maxlength: "1000", "aria-label": "Your message" });
    this.sendBtn = el("button", { class: "send", type: "submit", "aria-label": "Send" }, [icon("up", 20)]);
    this.form = el("form", { class: "form", onsubmit: function (e) { e.preventDefault(); self.submit(); } }, [this.input, this.sendBtn]);
    this.brand = el("div", { class: "brand" });
    this.brand.appendChild(document.createTextNode("Powered by "));
    this.brand.appendChild(link("https://github.com/chbenamrane/free-chatbot-generator", "Free Chatbot Generator"));
    this.panel.appendChild(head); this.panel.appendChild(this.msgs); this.panel.appendChild(this.chips); this.panel.appendChild(this.form); this.panel.appendChild(this.brand);
    this.root.appendChild(this.panel);
    if (!this.inline) this.root.appendChild(this.launcher);
    shadow.appendChild(this.root);

    this.input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); self.submit(); } });
    this.input.addEventListener("input", function () { self.input.style.height = "auto"; self.input.style.height = Math.min(self.input.scrollHeight, 110) + "px"; });
    this.panel.addEventListener("keydown", function (e) { if (e.key === "Escape" && !self.inline) { self.close(); self.launcher.focus(); } });
    (container || document.body).appendChild(this.host);
  };

  // Applies the appearance (also used for the live preview in the admin).
  Widget.prototype.apply = function () {
    var c = this.cfg, dark = c.theme === "dark" || (c.theme === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    this.root.className = "root " + c.position + (dark ? " dark" : "") + (this.inline ? " inline" : "") + (this.root.classList.contains("open") ? " open" : "");
    this.root.style.setProperty("--c", /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : DEFAULTS.color);
    this.root.style.setProperty("--r", (+c.radius || 0) + "px");
    var title = c.title || this.name;
    this.titleEl.textContent = title;
    this.subtitleEl.textContent = c.subtitle || "";
    this.subtitleEl.style.display = c.subtitle ? "" : "none";
    this.avatarEl.textContent = "";
    if (/^https:\/\//i.test(c.avatar)) this.avatarEl.appendChild(el("img", { src: c.avatar, alt: "", referrerpolicy: "no-referrer" }));
    else this.avatarEl.textContent = c.avatar || title.charAt(0).toUpperCase();
    this.launcher.textContent = "";
    this.launcher.appendChild(icon(ICONS[c.icon] ? c.icon : "chat", 26));
    if (c.launcherLabel) this.launcher.appendChild(el("span", { text: c.launcherLabel }));
    this.input.placeholder = c.placeholder || DEFAULTS.placeholder;
    this.brand.style.display = c.showBranding ? "" : "none";
    this.panel.setAttribute("aria-label", title);
    this.renderChips();
  };

  Widget.prototype.update = function (appearance, name, welcome) {
    this.cfg = Object.assign({}, DEFAULTS, appearance || {});
    if (name) this.name = name;
    this.apply();
    if (welcome !== undefined && welcome !== this.welcome && !this.hasUserMessage) { this.welcome = welcome; this.msgs.textContent = ""; if (welcome) this.addBot(welcome, null, true); }
  };

  Widget.prototype.renderChips = function () {
    var self = this;
    this.chips.textContent = "";
    var show = !this.hasUserMessage && this.cfg.suggestions && this.cfg.suggestions.length;
    this.chips.style.display = show ? "" : "none";
    if (!show) return;
    this.cfg.suggestions.forEach(function (text) {
      self.chips.appendChild(el("button", { class: "chip", type: "button", text: text, onclick: function () { self.submit(text); } }));
    });
  };

  Widget.prototype.open = function () {
    this.root.classList.add("open"); this.launcher.setAttribute("aria-expanded", "true");
    this.scroll(); var i = this.input; setTimeout(function () { i.focus(); }, 50);
  };
  Widget.prototype.close = function () { this.root.classList.remove("open"); this.launcher.setAttribute("aria-expanded", "false"); };
  Widget.prototype.toggle = function () { this.root.classList.contains("open") ? this.close() : this.open(); };
  Widget.prototype.scroll = function () { this.msgs.scrollTop = this.msgs.scrollHeight; };

  Widget.prototype.addMe = function (text) {
    this.msgs.appendChild(el("div", { class: "row me" }, [el("div", { class: "bubble", text: text })]));
    this.scroll();
  };
  Widget.prototype.addBot = function (text, id, silent) {
    var bubble = el("div", { class: "bubble" });
    renderText(bubble, text);
    var row = el("div", { class: "row bot" }, [bubble]);
    if (id && !silent) row.appendChild(this.feedbackBar(id));
    this.msgs.appendChild(row);
    this.scroll();
    return { row: row, bubble: bubble };
  };
  Widget.prototype.feedbackBar = function (id) {
    var self = this, bar = el("div", { class: "fb" });
    [[1, "👍", "Helpful"], [-1, "👎", "Not helpful"]].forEach(function (o) {
      var b = el("button", { type: "button", text: o[1], "aria-label": o[2], onclick: function () {
        var on = b.classList.contains("on");
        Array.prototype.forEach.call(bar.children, function (x) { x.classList.remove("on"); });
        if (!on) b.classList.add("on");
        self.post("/api/v1/feedback", { id: id, value: on ? 0 : o[0] }).catch(function () {});
      } });
      bar.appendChild(b);
    });
    return bar;
  };

  Widget.prototype.post = function (path, body) {
    return fetch(this.api + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Bot-Key": this.key }, body: JSON.stringify(body) });
  };

  Widget.prototype.setBusy = function (busy) { this.busy = busy; this.sendBtn.disabled = busy; this.input.disabled = busy; if (!busy) this.input.focus(); };

  Widget.prototype.submit = function (preset) {
    var text = (preset || this.input.value).trim();
    if (!text || this.busy) return;
    this.input.value = ""; this.input.style.height = "auto";
    this.hasUserMessage = true; this.renderChips();
    this.addMe(text);
    this.ask(text);
  };

  Widget.prototype.ask = function (text) {
    var self = this;
    this.setBusy(true);
    var typing = el("div", { class: "row bot" }, [el("div", { class: "bubble" }, [el("span", { class: "dots" }, [el("i"), el("i"), el("i")])])]);
    this.msgs.appendChild(typing); this.scroll();
    var live = null, full = "", doneId = null, failed = null;
    var history = this.history.slice(-8);
    if (!this.conversationId) this.conversationId = Math.random().toString(36).slice(2) + Date.now().toString(36);

    this.post("/api/v1/chat", { message: text, history: history, conversationId: this.conversationId, stream: true })
      .then(function (res) {
        if (!res.ok || !res.body) return res.json().catch(function () { return {}; }).then(function (d) { throw new Error((d.error && d.error.message) || "The chatbot is unavailable right now."); });
        var reader = res.body.getReader(), decoder = new TextDecoder(), buffer = "";
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buffer += decoder.decode(r.value, { stream: true });
            var parts = buffer.split("\n\n"); buffer = parts.pop();
            parts.forEach(function (part) {
              if (part.slice(0, 5) !== "data:") return;
              var ev; try { ev = JSON.parse(part.slice(5)); } catch (e) { return; }
              if (ev.type === "delta") {
                if (!live) { typing.remove(); live = self.addBot("", null, true); }
                full += ev.text; renderText(live.bubble, full); self.scroll();
              } else if (ev.type === "done") doneId = ev.id;
              else if (ev.type === "error") failed = ev.message;
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) { failed = err && err.message ? err.message : "The chatbot is unavailable right now."; })
      .then(function () {
        typing.remove();
        if (failed && !full) {
          var e = self.addBot(failed, null, true); e.bubble.classList.add("err");
        } else {
          full = full.trim();
          if (live) { renderText(live.bubble, full); if (doneId) live.row.appendChild(self.feedbackBar(doneId)); }
          self.history.push({ role: "user", content: text }, { role: "assistant", content: full });
          self.save();
        }
        self.setBusy(false); self.scroll();
      });
  };

  // Conversation kept for the browser tab only (sessionStorage), so a page change does not erase it.
  Widget.prototype.save = function () {
    try { sessionStorage.setItem(this.storeKey, JSON.stringify({ h: this.history.slice(-30), c: this.conversationId })); } catch (e) { /* storage unavailable */ }
  };
  Widget.prototype.restore = function () {
    try {
      var data = JSON.parse(sessionStorage.getItem(this.storeKey) || "null");
      if (!data || !data.h || !data.h.length) return;
      var self = this;
      this.history = data.h; this.conversationId = data.c || null; this.hasUserMessage = true;
      if (this.welcome) this.addBot(this.welcome, null, true);
      data.h.forEach(function (m) { m.role === "user" ? self.addMe(m.content) : self.addBot(m.content, null, true); });
    } catch (e) { /* ignore */ }
  };

  // ---- public API and auto start
  var instance = null;
  var FreeChatbot = {
    __loaded: true,
    open: function () { instance && instance.open(); },
    close: function () { instance && instance.close(); },
    toggle: function () { instance && instance.toggle(); },
    // Used by the admin preview: mounts the widget inside a container and lets the caller update its look.
    mount: function (opts) { return new Widget(opts); },
  };
  window.FreeChatbot = FreeChatbot;

  function start() {
    if (!script) return;
    var key = script.getAttribute("data-bot");
    if (!key) { console.warn("[FreeChatbot] missing data-bot attribute"); return; }
    var api = script.getAttribute("data-api") || (script.src ? new URL(script.src).origin : location.origin);
    fetch(api.replace(/\/+$/, "") + "/api/v1/bots/" + encodeURIComponent(key) + "/config")
      .then(function (r) { if (!r.ok) throw new Error("config " + r.status); return r.json(); })
      .then(function (cfg) {
        if (!cfg.enabled) return;
        instance = new Widget({ key: key, api: api, appearance: cfg.appearance, name: cfg.name, welcome: cfg.welcomeMessage, open: script.getAttribute("data-open") === "true" });
      })
      .catch(function (e) { console.warn("[FreeChatbot] not started:", e.message); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
