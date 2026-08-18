"use client";

import { useSyncExternalStore } from "react";
import { PALETTE_EVENT } from "./CommandPalette";

/* The shortcut is invisible unless it is advertised. Both keys work on every
   platform (the handler accepts ctrlKey or metaKey), but showing ⌘ to a Mac
   and CTRL to everyone else is what each visitor expects to see. */
const subscribe = () => () => {};
const isApple = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export default function PaletteHint({ className = "" }: { className?: string }) {
  // Platform is read through an external store rather than in an effect: it
  // does not exist on the server, and a setState-after-mount would be the
  // pattern the hooks lint rejects.
  const mac = useSyncExternalStore(subscribe, isApple, () => false);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(PALETTE_EVENT))}
      data-cursor="MENU"
      title="Open the command palette"
      className={`group inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-ink-muted transition-colors hover:text-signal ${className}`}
    >
      <kbd className="rounded border border-grid px-1.5 py-0.5 text-[9px] transition-colors group-hover:border-signal">
        {mac ? "⌘" : "CTRL"} K
      </kbd>
      <span className="opacity-50">or</span>
      <kbd className="rounded border border-grid px-1.5 py-0.5 text-[9px] transition-colors group-hover:border-signal">
        /
      </kbd>
    </button>
  );
}
