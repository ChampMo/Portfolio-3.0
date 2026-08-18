"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

/**
 * The address used to be a bare `mailto:` link. On a machine with no mail
 * client registered — the default state of a fresh Windows install — the
 * browser silently does nothing, so the link looked broken.
 *
 * Copying is the action that always works, so that becomes the primary
 * click. The envelope beside it keeps `mailto:` available for anyone who
 * does have a client wired up.
 */
export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Older browsers, or a page served over plain http, have no async
      // clipboard. Fall back to the selection-based command.
      const ta = document.createElement("textarea");
      ta.value = email;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing else to try — leave the state untouched */
        document.body.removeChild(ta);
        return;
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        data-cursor={copied ? "COPIED" : "COPY"}
        title="Copy address"
        className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-ink-muted transition-colors hover:text-signal"
      >
        {copied ? (
          <Check size={12} aria-hidden="true" className="text-telemetry" />
        ) : (
          <Copy size={12} aria-hidden="true" className="opacity-60" />
        )}
        {email}
      </button>

      <a
        href={`mailto:${email}`}
        aria-label="Open in mail app"
        title="Open in mail app"
        data-cursor="SEND"
        className="text-ink-muted/50 transition-colors hover:text-signal"
      >
        <Mail size={12} aria-hidden="true" />
      </a>

      {/* Announced without moving anything on screen. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Address copied" : ""}
      </span>
    </span>
  );
}
