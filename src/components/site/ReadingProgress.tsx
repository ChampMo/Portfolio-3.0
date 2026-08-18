"use client";

import { useEffect, useRef } from "react";

/**
 * How far through the write-up the reader is.
 *
 * Measured against the document rather than a specific article element so it
 * stays correct however the page is composed, and written straight to the
 * node — a scroll handler that re-rendered React would be the most expensive
 * thing on the page for a two-pixel bar.
 */
export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        bar.style.transform = `scaleX(${p})`;
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[70] h-[3px] bg-grid/40">
      <div ref={barRef} className="h-full origin-left scale-x-0 bg-signal" />
    </div>
  );
}
