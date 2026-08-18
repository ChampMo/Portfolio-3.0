"use client";

import { useEffect, useRef } from "react";

/**
 * A panel that unfolds as it is scrolled into view.
 *
 * Scroll position is mapped to a single `--open` custom property from 0 to 1;
 * the CSS in site.css does everything else. Keeping the JS to one number means
 * the loop touches one property per frame instead of a style object, and the
 * whole look — how far it opens, what the rows do — stays adjustable in CSS.
 *
 * The rAF loop only runs while the panel is near the viewport. A permanent
 * loop per instance is how a page ends up burning a core doing nothing.
 */
export default function ScrollOpen({
  children,
  className = "",
  /** Viewport fraction where opening starts (1 = bottom edge). */
  from = 0.92,
  /** Viewport fraction where it finishes. */
  to = 0.65,
}: {
  children: React.ReactNode;
  className?: string;
  from?: number;
  to?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--open", "1");
      return;
    }

    let raf = 0;
    let running = false;

    const update = () => {
      const vh = window.innerHeight;
      const rect = el.getBoundingClientRect();

      // Measured from the element's top edge: the panel starts opening as its
      // top crosses `from` and is fully open by the time it reaches `to`.
      const start = vh * from;
      const end = vh * to;
      const p = (start - rect.top) / Math.max(1, start - end);

      el.style.setProperty("--open", String(Math.min(1, Math.max(0, p))));
      if (running) raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const near = entries.some((e) => e.isIntersecting);
        if (near === running) return;
        running = near;
        if (running) {
          raf = requestAnimationFrame(update);
        } else {
          cancelAnimationFrame(raf);
          // Settle on the end state so a fast scroll past cannot strand the
          // panel half-open.
          update();
        }
      },
      // Generous margin so the value is already correct on the frame it
      // becomes visible, rather than snapping from 0.
      { rootMargin: "40% 0px 40% 0px" }
    );

    io.observe(el);
    update();

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [from, to]);

  return (
    <div ref={ref} className={`scroll-open ${className}`}>
      {children}
    </div>
  );
}
