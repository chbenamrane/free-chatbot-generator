"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/components/form-styles";
import { DEFAULT_APPEARANCE, type Appearance } from "@/lib/bots/appearance";
import { toast } from "@/lib/swal";
import { saveAppearanceAction } from "./actions";

type WidgetHandle = { update: (appearance: Appearance, name?: string, welcome?: string) => void; host: HTMLElement };
type FreeChatbotApi = { mount: (opts: Record<string, unknown>) => WidgetHandle };
declare global {
  interface Window {
    FreeChatbot?: FreeChatbotApi;
  }
}

function loadWidgetScript(): Promise<FreeChatbotApi> {
  return new Promise((resolve, reject) => {
    if (window.FreeChatbot) return resolve(window.FreeChatbot);
    const tag = document.createElement("script");
    tag.src = "/widget.js";
    tag.onload = () => (window.FreeChatbot ? resolve(window.FreeChatbot) : reject(new Error("widget missing")));
    tag.onerror = () => reject(new Error("widget failed to load"));
    document.head.appendChild(tag);
  });
}

type Props = { botId: string; publicKey: string; name: string; welcomeMessage: string; initial: Appearance };

export function AppearanceEditor({ botId, publicKey, name, welcomeMessage, initial }: Props) {
  const [a, setA] = useState<Appearance>(initial);
  const [state, save, saving] = useActionState(saveAppearanceAction, undefined);
  const previewRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WidgetHandle | null>(null);
  const latest = useRef({ a, name, welcomeMessage });

  const set = <K extends keyof Appearance>(key: K, value: Appearance[K]) => setA((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (state?.ok) toast("Appearance saved");
  }, [state]);

  // Mount the real widget inside the preview box (once), then keep it in sync with the form.
  useEffect(() => {
    let cancelled = false;
    loadWidgetScript()
      .then((api) => {
        if (cancelled || !previewRef.current) return;
        const { a: current, name: n, welcomeMessage: w } = latest.current;
        handleRef.current = api.mount({ key: publicKey, api: window.location.origin, container: previewRef.current, appearance: current, name: n, welcome: w, noStore: true, open: true });
      })
      .catch(() => toast("The preview could not load the widget.", "error"));
    return () => {
      cancelled = true;
      handleRef.current?.host.remove();
      handleRef.current = null;
    };
  }, [publicKey]);

  useEffect(() => {
    latest.current = { a, name, welcomeMessage };
    handleRef.current?.update(a, name, welcomeMessage);
  }, [a, name, welcomeMessage]);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <form action={save} className="space-y-5 rounded-2xl border border-border bg-surface p-5">
        <input type="hidden" name="botId" value={botId} />
        <input type="hidden" name="appearance" value={JSON.stringify(a)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Accent color</span>
            <div className="flex items-center gap-2">
              <input type="color" value={a.color} onChange={(e) => set("color", e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background" aria-label="Accent color" />
              <input value={a.color} onChange={(e) => set("color", e.target.value)} maxLength={7} className={`${inputClass} font-mono`} aria-label="Accent color hex value" />
            </div>
          </label>
          <label className="block">
            <span className={labelClass}>Corner roundness: {a.radius}px</span>
            <input type="range" min={0} max={28} value={a.radius} onChange={(e) => set("radius", Number(e.target.value))} className="mt-2 w-full accent-brand" />
          </label>
          <label className="block">
            <span className={labelClass}>Position</span>
            <select value={a.position} onChange={(e) => set("position", e.target.value as Appearance["position"])} className={inputClass}>
              <option value="right">Bottom right</option>
              <option value="left">Bottom left</option>
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Theme</span>
            <select value={a.theme} onChange={(e) => set("theme", e.target.value as Appearance["theme"])} className={inputClass}>
              <option value="auto">Follow the visitor&apos;s system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Button icon</span>
            <select value={a.icon} onChange={(e) => set("icon", e.target.value as Appearance["icon"])} className={inputClass}>
              <option value="chat">Chat bubble</option>
              <option value="sparkles">Sparkles</option>
              <option value="help">Help</option>
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Button label</span>
            <input value={a.launcherLabel} onChange={(e) => set("launcherLabel", e.target.value)} maxLength={40} placeholder="Chat with us" className={inputClass} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Title</span>
            <input value={a.title} onChange={(e) => set("title", e.target.value)} maxLength={60} placeholder={name} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Subtitle</span>
            <input value={a.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={100} placeholder="Usually replies instantly" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Avatar</span>
            <input value={a.avatar} onChange={(e) => set("avatar", e.target.value)} maxLength={500} placeholder="An emoji, or https://…/logo.png" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Input placeholder</span>
            <input value={a.placeholder} onChange={(e) => set("placeholder", e.target.value)} maxLength={80} className={inputClass} />
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Suggested questions</span>
          <textarea
            rows={3}
            value={a.suggestions.join("\n")}
            onChange={(e) => set("suggestions", e.target.value.split("\n").slice(0, 4).map((line) => line.slice(0, 80)))}
            placeholder={"What are your opening hours?\nHow much does it cost?"}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-muted">One per line, 4 at most. Shown as buttons before the visitor writes anything.</span>
        </label>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={a.openOnLoad} onChange={(e) => set("openOnLoad", e.target.checked)} className="accent-brand" />
            Open the chat when the page loads
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={a.showBranding} onChange={(e) => set("showBranding", e.target.checked)} className="accent-brand" />
            Show &quot;Powered by&quot;
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? "Saving…" : "Save appearance"}</button>
          <button type="button" onClick={() => setA({ ...DEFAULT_APPEARANCE })} className={secondaryButton}>Reset</button>
          {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
        </div>
      </form>

      <div className="space-y-2 xl:sticky xl:top-6">
        <p className="text-sm font-medium">Live preview</p>
        <p className="text-xs text-muted">This is the real widget talking to this chatbot (messages you send here appear in its conversations).</p>
        <div ref={previewRef} className="rounded-2xl border border-dashed border-border bg-background p-4" />
      </div>
    </div>
  );
}
