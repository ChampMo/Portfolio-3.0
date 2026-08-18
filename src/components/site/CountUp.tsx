"use client";

import { useEffect, useRef } from "react";

/**
 * Counts a number up when it first scrolls into view.
 *
 * Writes straight to the DOM node through a ref rather than through state:
 * a per-frame setState would re-render the whole subtree ~60×/s for a purely
 * visual effect, and calling setState from inside the effect is exactly what
 * the react-hooks lint rule flags.
 */
export default function CountUp({
  value,
  decimals = 2,
  duration = 1100,
  className,
}: {
  value: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const target = Number.parseFloat(value);

  useEffect(() => {
    const el = ref.current;
    // Not a number (e.g. "—") — leave the text exactly as rendered.
    if (!el || !Number.isFinite(target)) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = target.toFixed(decimals);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();

        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (p < 1) raf = requestAnimationFrame(step);
          else el.textContent = target.toFixed(decimals);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, decimals, duration]);

  // SSR renders the final value, so the number is correct without JS.
  return (
    <span ref={ref} className={className}>
      {Number.isFinite(target) ? target.toFixed(decimals) : value}
    </span>
  );
}
