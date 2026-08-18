"use client";

import { useLayoutEffect, useRef } from "react";

/** Reorder animation duration; the drag cooldown in ListEditor matches it. */
export const FLIP_MS = 260;

/**
 * FLIP animation for a list whose items change order.
 *
 * Reordering moves nodes in the DOM, and a CSS transition cannot animate that:
 * the element is simply painted at its new coordinates on the next frame. FLIP
 * works around it — remember where each item was (First), let React commit the
 * new order (Last), apply the inverse offset so it *looks* unmoved (Invert),
 * then animate that offset away (Play).
 *
 * Items opt in with `data-flip-id="<stable id>"`.
 */
export function useFlip(containerRef: React.RefObject<HTMLElement | null>, key: unknown) {
  const positions = useRef(new Map<string, { left: number; top: number }>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>("[data-flip-id]")
    );

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /**
     * Measured against the container's scrolled content, not the viewport.
     *
     * `getBoundingClientRect` is viewport-relative, and these positions are
     * compared across renders that may be minutes apart. The admin list is
     * `position: sticky` with its own `overflow-y: auto`, so between two
     * reorders the page can scroll, the list can scroll inside itself, or the
     * sticky box can unpin — and every stored coordinate shifts by that amount
     * without a single row having moved. The animation then plays a delta that
     * is mostly scroll: either a nudge too small to see, or rows arriving from
     * off-screen. Subtracting the container's own origin and scroll offset
     * removes both sources.
     */
    const box = container.getBoundingClientRect();
    const originX = box.left - container.scrollLeft;
    const originY = box.top - container.scrollTop;

    for (const node of nodes) {
      const id = node.dataset.flipId;
      if (!id) continue;

      const rect = node.getBoundingClientRect();
      const next = { left: rect.left - originX, top: rect.top - originY };
      const before = positions.current.get(id);

      if (before && !reduce) {
        const dx = before.left - next.left;
        const dy = before.top - next.top;

        // Sub-pixel drift isn't worth an animation.
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          node.animate(
            [
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: "translate(0, 0)" },
            ],
            { duration: FLIP_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
          );
        }
      }

      positions.current.set(id, next);
    }

    // Drop ids that have left the list so the map cannot grow forever.
    const live = new Set(nodes.map((n) => n.dataset.flipId));
    for (const id of positions.current.keys()) {
      if (!live.has(id)) positions.current.delete(id);
    }
  }, [containerRef, key]);
}
