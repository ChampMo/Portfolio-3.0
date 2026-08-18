"use client";

import { useEffect, useRef } from "react";

/** Counter run-up. */
const COUNT_MS = 1600;
/** Beat at 100 before the curtain parts, so it does not snap away instantly. */
const HOLD_MS = 420;
/** Must match the panel transition in site.css. */
const OPEN_MS = 950;

/**
 * Survives React Strict Mode's development double-mount.
 *
 * Strict Mode runs every effect as mount → cleanup → mount. The decision of
 * whether to play is read from a DOM attribute, so if cleanup cleared that
 * attribute the second mount would read "already handled", bail out, and leave
 * the counter frozen at 000 before CSS hid the curtain. Holding the phase at
 * module scope means the second mount resumes the same run instead of
 * re-deciding, and cleanup now only cancels timers.
 */
let phase: "pending" | "running" | "done" = "pending";

/**
 * First-load curtain: counts to 100, holds, then splits open to reveal the hero.
 *
 * Whether it runs at all is decided before paint by `PreloadFlag`, which sets
 * `data-preload="1"` on <html>. This component animates and then clears that
 * attribute — CSS keys both the curtain's visibility and the scroll lock off
 * it, so removing it finishes everything in one step.
 *
 * It also owns the `booted` class that starts the hero's staggered entrance, so
 * the boot sequence plays as the curtain parts rather than unseen behind it.
 *
 * State lives in DOM attributes, not React state: the markup never changes
 * shape, and driving a per-frame counter through re-renders would be waste.
 */
export default function Preloader() {
  const counterRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    const boot = () => document.body.classList.add("booted");
    const clearCurtain = () => {
      root.removeAttribute("data-preload");
      root.removeAttribute("data-preload-opening");
    };

    if (phase === "pending") {
      phase = root.dataset.preload === "1" ? "running" : "done";
    }

    if (phase === "done") {
      clearCurtain();
      boot();
      return;
    }

    // Strict Mode's first cleanup may have run before this mount; make sure
    // the flag the CSS keys off is present for the run we are about to start.
    root.dataset.preload = "1";

    const start = performance.now();
    let raf = 0;
    let openTimer = 0;
    let bootTimer = 0;
    let doneTimer = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      if (counterRef.current) {
        counterRef.current.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      }
      if (p < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }

      openTimer = window.setTimeout(() => {
        root.dataset.preloadOpening = "1";
        // Overlap the hero entrance with the curtain parting.
        bootTimer = window.setTimeout(boot, 180);
        doneTimer = window.setTimeout(() => {
          phase = "done";
          clearCurtain();
        }, OPEN_MS + 120);
      }, HOLD_MS);
    };

    raf = requestAnimationFrame(tick);

    // Only cancel work in flight. Touching the flag here is what broke the
    // Strict Mode remount.
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(openTimer);
      window.clearTimeout(bootTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div className="preloader" aria-hidden="true">
      <div className="preloader-panel preloader-top" />
      <div className="preloader-panel preloader-bottom" />

      <div className="preloader-content">
        <span className="preloader-label">ACQUIRING SIGNAL</span>
        <span className="preloader-count" ref={counterRef}>
          000
        </span>
        <span className="preloader-bar">
          <span className="preloader-fill" />
        </span>
      </div>
    </div>
  );
}
