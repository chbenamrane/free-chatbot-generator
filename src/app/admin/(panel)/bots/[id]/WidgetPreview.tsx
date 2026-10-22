"use client";

import { useEffect, useRef } from "react";
import type { Appearance } from "@/lib/bots/appearance";
import type { LeadForm } from "@/lib/bots/lead-form";
import { toast } from "@/lib/swal";

type WidgetHandle = { update: (appearance: Appearance, name?: string, welcome?: string, collect?: LeadForm | null) => void; host: HTMLElement };
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

type Props = { publicKey: string; name: string; welcomeMessage: string; appearance: Appearance; collect: LeadForm | null };

// The real widget, mounted in a box and kept in sync with what the admin is editing.
// Chat messages typed here are real; visitor information is never sent from the preview.
export function WidgetPreview({ publicKey, name, welcomeMessage, appearance, collect }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WidgetHandle | null>(null);
  const latest = useRef({ appearance, name, welcomeMessage, collect });

  useEffect(() => {
    let cancelled = false;
    loadWidgetScript()
      .then((api) => {
        if (cancelled || !boxRef.current) return;
        const current = latest.current;
        handleRef.current = api.mount({
          key: publicKey,
          api: window.location.origin,
          container: boxRef.current,
          appearance: current.appearance,
          collect: current.collect,
          name: current.name,
          welcome: current.welcomeMessage,
          noStore: true,
          open: true,
        });
      })
      .catch(() => toast("The preview could not load the widget.", "error"));
    return () => {
      cancelled = true;
      handleRef.current?.host.remove();
      handleRef.current = null;
    };
  }, [publicKey]);

  useEffect(() => {
    latest.current = { appearance, name, welcomeMessage, collect };
    handleRef.current?.update(appearance, name, welcomeMessage, collect);
  }, [appearance, name, welcomeMessage, collect]);

  return <div ref={boxRef} className="rounded-2xl border border-dashed border-border bg-background p-4" />;
}
