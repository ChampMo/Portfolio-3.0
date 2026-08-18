"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Share2, Check, Link2, X } from "lucide-react";
import { Icon } from "@iconify/react";

type Target = { id: string; label: string; icon: string; href: (u: string, t: string) => string };

/* Whether the OS share sheet is worth preferring. Read as an external store,
   not in an effect: it does not exist on the server, and setting state from an
   effect is the cascading-render pattern the hooks lint rejects. Coarse
   pointer stands in for "has a real share sheet" — desktop Safari exposes
   navigator.share too, but as a worse version of the menu below. */
const subscribeNative = () => () => {};
const hasShareSheet = () =>
  typeof navigator.share === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

/* Deliberately not the usual western-only set. LINE is how a link actually
   travels in Thailand, and LinkedIn is where a portfolio link is worth most. */
const TARGETS: Target[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "mdi:linkedin",
    href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  },
  {
    id: "line",
    label: "LINE",
    icon: "simple-icons:line",
    href: (u, t) => `https://social-plugins.line.me/lineit/share?url=${u}&text=${t}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "mdi:facebook",
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  },
  {
    id: "x",
    label: "X",
    icon: "simple-icons:x",
    href: (u, t) => `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  },
];

/**
 * Share control for a project page.
 *
 * On a phone the first tap goes straight to the OS share sheet, which is both
 * what the platform user expects and the only way to reach the apps a web page
 * cannot link into. Everywhere else it opens a small menu, because a desktop
 * browser's `navigator.share` either does not exist or is a worse version of
 * these four links.
 *
 * Copy is always present and always first: it is the one action that works no
 * matter what the visitor intends to do with the link.
 */
export default function ShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canNative = useSyncExternalStore(subscribeNative, hasShareSheet, () => false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No async clipboard (older browser, or a page served over plain http).
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  async function click() {
    if (canNative) {
      try {
        await navigator.share({ title, url: window.location.href });
        return;
      } catch {
        // Cancelled, or the sheet refused — fall through to the menu.
      }
    }
    setOpen((v) => !v);
  }

  const url = typeof window === "undefined" ? "" : encodeURIComponent(window.location.href);
  const text = encodeURIComponent(title);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={click}
        aria-expanded={open}
        aria-haspopup="menu"
        data-cursor="SHARE"
        className="inline-flex items-center gap-2 rounded-full border border-grid px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
      >
        {copied ? (
          <Check size={12} aria-hidden="true" className="text-telemetry" />
        ) : (
          <Share2 size={12} aria-hidden="true" />
        )}
        {copied ? "Copied" : "Share"}
      </button>

      {open ? (
        <div
          role="menu"
          className="share-menu absolute right-0 top-[calc(100%+8px)] z-[60] w-[212px] overflow-hidden rounded-[14px] border border-grid bg-panel"
        >
          <div className="flex items-center justify-between border-b border-grid px-3.5 py-2.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-muted">
              Transmit
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="text-ink-muted transition-colors hover:text-signal"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void copy();
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left font-mono text-[11px] text-ink transition-colors hover:bg-panel-2"
          >
            <Link2 size={13} aria-hidden="true" className="shrink-0 text-signal" />
            Copy link
          </button>

          <div className="border-t border-grid">
            {TARGETS.map((t) => (
              <a
                key={t.id}
                role="menuitem"
                href={t.href(url, text)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 font-mono text-[11px] text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink"
              >
                <Icon icon={t.icon} width={13} aria-hidden="true" className="shrink-0" />
                {t.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
