"use client";

import { useEffect, useRef } from "react";

/**
 * Pulls its child toward the pointer while hovering, then springs back.
 *
 * Wraps rather than clones so the child keeps whatever element and props it
 * already has. Transforms are written straight to the node — running this
 * through state would re-render on every mousemove for a purely visual effect.
 */
export default function Magnetic({
  children,
  /** Fraction of the pointer offset the element follows. */
  strength = 0.28,
  /** Distance outside the element that still counts as "near", in px. */
  padding = 28,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  padding?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Pointer-driven, so it is meaningless on touch and unwanted when the
    // visitor has asked for reduced motion.
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const target = el.firstElementChild as HTMLElement | null;
    if (!target) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let active = false;

    // Eased follow rather than snapping to the pointer, so the pull reads as
    // weight instead of a jump.
    const loop = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      target.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;

      if (!active && Math.abs(cx) < 0.1 && Math.abs(cy) < 0.1) {
        target.style.transform = "";
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const near =
        e.clientX >= r.left - padding &&
        e.clientX <= r.right + padding &&
        e.clientY >= r.top - padding &&
        e.clientY <= r.bottom + padding;

      if (!near) {
        active = false;
        tx = 0;
        ty = 0;
        start();
        return;
      }

      active = true;
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      start();
    };

    const onLeave = () => {
      active = false;
      tx = 0;
      ty = 0;
      start();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      cancelAnimationFrame(raf);
      target.style.transform = "";
    };
  }, [strength, padding]);

  return (
    <span ref={ref} className={`inline-block ${className ?? ""}`}>
      {children}
    </span>
  );
}
