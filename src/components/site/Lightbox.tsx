"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { lockScroll } from "@/lib/site/scrollLock";

/**
 * Full-screen image viewer, shared by every place that opens a picture.
 *
 * Extracted from the gallery block so the product deck opens its screenshots
 * the same way — one set of keys, one set of gestures, one close button, and a
 * single place to fix anything about any of them.
 */
export default function Lightbox({
  images,
  index,
  title,
  onIndex,
  onClose,
}: {
  images: string[];
  /** Which image is open. */
  index: number;
  title?: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const count = images.length;
  /**
   * Guards the wheel against a single flick counting many times.
   *
   * One trackpad gesture is dozens of events, and a mouse wheel notch is
   * often several — without this, a flick meant to advance one frame walked
   * the whole gallery in a blur.
   */
  const nextWheel = useRef(0);

  const step = useCallback(
    (delta: number) => onIndex((index + delta + count) % count),
    [index, count, onIndex]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };

    const onWheel = (e: WheelEvent) => {
      // The page behind is locked, so the wheel has nothing else to do here.
      e.preventDefault();
      if (count < 2) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 8) return;

      const now = performance.now();
      if (now < nextWheel.current) return;
      nextWheel.current = now + 260;

      step(delta > 0 ? 1 : -1);
    };

    window.addEventListener("keydown", onKey);
    // Non-passive: this one genuinely needs to cancel the default.
    window.addEventListener("wheel", onWheel, { passive: false });

    // The page behind must not scroll while the overlay owns the viewport.
    const unlock = lockScroll();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      unlock();
    };
  }, [step, onClose, count]);

  if (count === 0) return null;
  // No mount flag: both overlays are opened by a click, so they never exist
  // during the server render and there is no hydration pass to disagree with.
  if (typeof document === "undefined") return null;
  const safe = Math.min(Math.max(0, index), count - 1);

  /**
   * Rendered into `document.body`, not where it is written.
   *
   * The viewer is `position: fixed`, so it looks detached — but in the tree it
   * sat wherever it was opened from, and in the product deck that is inside
   * the horizontally scrolling track. Every wheel event over the open image
   * bubbled out of the overlay and into the deck's own wheel handler, so
   * scrolling to the next picture also travelled to the next *product*
   * underneath it. Stopping propagation would have patched this one case;
   * moving the node out of the scroller means no ancestor can be surprised by
   * it, including whatever opens it next.
   */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Image viewer"}
      className="lightbox fixed inset-0 z-[110] flex flex-col bg-ground/95 backdrop-blur-[6px]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-grid px-5 py-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {title || "Frame"}{" "}
          <span className="tabular-nums text-signal">
            {String(safe + 1).padStart(2, "0")}
          </span>
          {" / "}
          <span className="tabular-nums">{String(count).padStart(2, "0")}</span>
          {count > 1 ? (
            <span className="ml-3 hidden text-ink-muted/60 sm:inline">
              Scroll or &larr; &rarr; to move
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-cursor="CLOSE"
          className="grid size-9 place-items-center rounded-full border border-grid text-ink-muted transition-colors hover:border-signal hover:text-signal"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        {/* Clicking the backdrop closes; the image itself does not. */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[safe]}
          src={images[safe]}
          alt={title ? `${title} — ${safe + 1}` : `Image ${safe + 1}`}
          className="lightbox-img relative max-h-full max-w-full rounded-card border border-grid object-contain"
        />

        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => step(-1)}
              data-cursor="PREV"
              className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-grid bg-panel/85 text-ink-muted backdrop-blur-sm transition-colors hover:border-signal hover:text-signal"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => step(1)}
              data-cursor="NEXT"
              className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-grid bg-panel/85 text-ink-muted backdrop-blur-sm transition-colors hover:border-signal hover:text-signal"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
