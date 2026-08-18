"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { readTrail } from "./RouteTrail";
import { slideBack } from "./SlideTransition";
import type { SlideDetail } from "./SlideTransition";

/** Back/forward is the only thing that changes which entry's state is live. */
function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function snapshot(): string {
  const { signalOrigin, signalDepth } = readTrail();
  // Serialised so `useSyncExternalStore` can compare snapshots by value; a
  // fresh object every call would loop forever.
  return signalOrigin ? `${signalDepth ?? 1}|${signalOrigin}` : "";
}

/** One step back, whatever that page was. */
function prevSnapshot(): string {
  return readTrail().signalPrev ?? "";
}

/** Human label for the page we would return to. */
function labelFor(path: string): string {
  if (path === "/") return "Back to deck";
  if (/^\/work\/.+/.test(path)) return "Back to project";
  if (path.startsWith("/work")) return "Back to archives";
  if (path.startsWith("/products")) return "Back to bay";
  if (path.startsWith("/resume")) return "Back to résumé";
  return "Back";
}

/**
 * "Back" that returns to the listing the visitor entered from — skipping past
 * any other project pages read along the way.
 *
 * `RouteTrail` records how many history steps that listing is, so this steps
 * over all of them at once with `history.go(-depth)`. Going through history
 * rather than pushing the path again is what restores the archive exactly as
 * it was left: its filters, its view mode, and its scroll position.
 *
 * Still a real anchor, so middle-click and keyboard work, and so a visitor
 * who arrived directly with no history to step through gets a working link.
 */
export default function BackLink({
  fallbackHref = "/work",
  fallbackLabel = "Back to archives",
  mode = "origin",
  slide,
}: {
  fallbackHref?: string;
  fallbackLabel?: string;
  /**
   * "origin" walks back past any project pages to the listing the run started
   * from. "previous" is a single step — right for a page that can be reached
   * from several different places and should simply undo the last move.
   */
  mode?: "origin" | "previous";
  /** Set to play the bulkhead wipe on the way back. */
  slide?: SlideDetail["from"];
}) {
  // history.state is a source outside React and does not exist on the server.
  const trail = useSyncExternalStore(
    subscribe,
    mode === "previous" ? prevSnapshot : snapshot,
    () => ""
  );

  let depth = 0;
  let target: string | null = null;

  if (mode === "previous") {
    target = trail || null;
    depth = target ? 1 : 0;
  } else {
    const sep = trail.indexOf("|");
    depth = sep > 0 ? Number(trail.slice(0, sep)) : 0;
    target = sep > 0 ? trail.slice(sep + 1) : null;
  }

  const href = target ?? fallbackHref;
  const label = target ? labelFor(target) : fallbackLabel;

  return (
    <Link
      href={href}
      data-cursor="BACK"
      onClick={(e) => {
        if (!target || depth < 1) return;
        // Let modified clicks open normally.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        if (slide) slideBack(depth, slide);
        else window.history.go(-depth);
      }}
      className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-signal"
    >
      <ArrowLeft
        size={13}
        aria-hidden="true"
        className="transition-transform group-hover:-translate-x-1"
      />
      {label}
    </Link>
  );
}
