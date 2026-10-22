"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/swal";

// A code block with a copy button.
export function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Copy failed: select the text and copy it manually.", "error");
    }
  }

  return (
    <div className="relative">
      {label && <p className="mb-1 text-xs font-medium text-muted">{label}</p>}
      <pre className="overflow-x-auto rounded-lg bg-background p-3 pr-12 font-mono text-xs leading-relaxed">{code}</pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy to clipboard"
        className={`absolute right-2 ${label ? "top-8" : "top-2"} rounded-md border border-border bg-surface p-1.5 text-muted hover:text-foreground`}
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
