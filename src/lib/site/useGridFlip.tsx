"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

const MOVE_MS = 420;
const OUT_MS = 340;
const IN_MS = 460;
const STAGGER_MS = 38;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type Snapshot = { rect: DOMRect; clone: HTMLElement };

/**
 * Re-layout animation for the archive grid.
 *
 * Three things happen at once when a filter changes, and each needs different
 * treatment:
 *
 *  - **survivors** move to new slots. The DOM moves them instantly, so they
 *    are FLIPped: offset back to where they were, then animated to zero.
 *  - **leavers** are gone from the DOM by the time any effect runs, so they
 *    cannot be animated in place. Instead a clone taken *before* the state
 *    change is parked over the old position in an overlay and dissolved
 *    there — which also frees the grid slot immediately, so survivors start
 *    moving on the same frame rather than after a collapse.
 *  - **arrivals** rise into place on a stagger.
 *
 * Because leavers must be captured before React removes them, `capture()`
 * has to be called from the event handler that triggers the change — not
 * from an effect.
 */
export function useGridFlip(
  containerRef: React.RefObject<HTMLElement | null>,
  ids: string[]
) {
  const snaps = useRef(new Map<string, Snapshot>());
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const first = useRef(true);
  const armed = useRef(false);

  const reduced = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Snapshot the current grid. Call immediately before changing filters. */
  const capture = useCallback(() => {
    if (reduced()) return;
    snaps.current.clear();
    // Armed even with no container — coming back from the empty state has
    // nothing to snapshot but still needs the arrival stagger.
    armed.current = true;

    const container = containerRef.current;
    if (!container) return;

    for (const node of container.querySelectorAll<HTMLElement>("[data-flip-id]")) {
      const id = node.dataset.flipId;
      if (!id) continue;
      const clone = node.cloneNode(true) as HTMLElement;
      snaps.current.set(id, { rect: node.getBoundingClientRect(), clone });
    }
  }, [containerRef]);

  useLayoutEffect(() => {
    // `container` may be null: filtering down to zero results unmounts the
    // grid entirely. The leaver pass still has to run in that case — that is
    // exactly the transition into the empty state.
    const container = containerRef.current;

    if (first.current) {
      first.current = false;
      return;
    }
    if (!armed.current || reduced()) {
      armed.current = false;
      snaps.current.clear();
      return;
    }
    armed.current = false;

    const nodes = container
      ? Array.from(container.querySelectorAll<HTMLElement>("[data-flip-id]"))
      : [];
    const live = new Set(nodes.map((n) => n.dataset.flipId));

    // ── leavers ──
    const overlay = overlayRef.current;
    if (overlay) {
      for (const [id, snap] of snaps.current) {
        if (live.has(id)) continue;
        const { clone, rect } = snap;
        clone.removeAttribute("data-flip-id");
        Object.assign(clone.style, {
          position: "fixed",
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: "0",
          pointerEvents: "none",
        });
        overlay.appendChild(clone);
        clone
          .animate(
            [
              { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
              { opacity: 0, transform: "scale(0.88)", filter: "blur(7px)" },
            ],
            { duration: OUT_MS, easing: "cubic-bezier(0.4, 0, 0.7, 0)", fill: "forwards" }
          )
          .addEventListener("finish", () => clone.remove());
      }
    }

    // ── survivors and arrivals ──
    let arrival = 0;
    for (const node of nodes) {
      const id = node.dataset.flipId;
      if (!id) continue;
      const before = snaps.current.get(id)?.rect;
      const now = node.getBoundingClientRect();

      if (before) {
        const dx = before.left - now.left;
        const dy = before.top - now.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          node.animate(
            [
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: "translate(0, 0)" },
            ],
            { duration: MOVE_MS, easing: EASE }
          );
        }
      } else {
        node.animate(
          [
            { opacity: 0, transform: "translateY(22px) scale(0.95)" },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: IN_MS,
            delay: arrival++ * STAGGER_MS,
            easing: EASE,
            fill: "backwards",
          }
        );
      }
    }

    snaps.current.clear();
  }, [containerRef, ids]);

  /**
   * Host for the dissolving clones. Rendered by the caller so it shares the
   * page's stacking context; `fixed` because the snapshots are viewport
   * coordinates.
   */
  const overlay = (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[6] overflow-hidden"
    />
  );

  return { capture, overlay };
}
