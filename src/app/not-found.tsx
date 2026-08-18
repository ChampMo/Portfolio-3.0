import "./site.css";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = { title: "Signal lost — 404" };

/**
 * Themed 404. The default Next page drops the visitor out of the site's world
 * entirely, which for a portfolio reads as a broken deploy rather than a
 * mistyped URL.
 */
export default function NotFound() {
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-ground px-[var(--pad-x)] text-center">
      {/* This page has no header to hang it off, so it sits in the corner. */}
      <div className="absolute right-[var(--pad-x)] top-7 z-[2]">
        <ThemeToggle />
      </div>
      <div className="grid-bg !inset-0 opacity-40" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(680px,92vw)] -translate-x-1/2 -translate-y-1/2 opacity-70"
        aria-hidden="true"
      >
        <div className="radar-rings" />
        <div className="radar-sweep" />
      </div>

      <div className="relative z-[1]">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-signal">
          Error 404
        </p>
        <h1 className="mb-6 font-display text-[clamp(3.5rem,13vw,9rem)] uppercase leading-[0.85]">
          Signal lost
        </h1>
        <p className="mx-auto mb-10 max-w-[42ch] text-[15px] leading-relaxed text-ink-muted">
          Nothing is transmitting on this frequency. The page may have been
          renamed, unpublished, or never existed.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            data-cursor="HOME"
            className="inline-flex items-center gap-2.5 rounded-full border border-signal bg-signal px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-on-signal transition-opacity hover:opacity-85"
          >
            Return to deck
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
          <Link
            href="/work"
            data-cursor="ARCHIVE"
            className="inline-flex items-center gap-2.5 rounded-full border border-grid px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
          >
            Browse archives
          </Link>
        </div>
      </div>
    </main>
  );
}
