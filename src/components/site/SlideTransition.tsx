"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export const SLIDE_EVENT = "signal:slide";

export type SlideDetail = {
  href: string;
  /** Which way the new page arrives from. */
  from: "right" | "left";
  /** When set, go back this many history steps rather than pushing `href`. */
  back?: number;
};

const IN_MS = 380;
const OUT_MS = 460;
/** If the route never changes, the panel must not stay stuck over the page. */
const SAFETY_MS = 2500;

/** Ask for an animated navigation from anywhere on the page. */
export function slideTo(href: string, from: SlideDetail["from"] = "right") {
  window.dispatchEvent(new CustomEvent<SlideDetail>(SLIDE_EVENT, { detail: { href, from } }));
}

/**
 * The same wipe, over a history step instead of a push.
 *
 * `href` is left empty because the destination is whatever the browser has
 * stored — going back through history is what restores the page's scroll
 * position and, on the archive, its filters. Reconstructing that from a path
 * would land on a fresh copy of the page instead of the one being returned to.
 */
export function slideBack(steps = 1, from: SlideDetail["from"] = "left") {
  window.dispatchEvent(
    new CustomEvent<SlideDetail>(SLIDE_EVENT, { detail: { href: "", from, back: steps } })
  );
}

/**
 * Bulkhead wipe between routes.
 *
 * A route change is a hard cut: the old page is gone the instant the new one
 * paints, and no amount of animating the outgoing page fixes that, because the
 * incoming page cannot be animated until it exists — and when it exists is up
 * to the network.
 *
 * So the continuity is carried by a single panel instead. It slides in over
 * the old page, the navigation happens underneath it, and it slides out the
 * far side to reveal the new one. One element, one direction of travel, and
 * the swap is hidden in the middle where nobody can see the seam. The panel is
 * appended to `document.body` rather than rendered by React precisely so the
 * route change cannot unmount it halfway through.
 *
 * Mounted once in the root layout; every entry point just fires the event.
 */
export default function SlideTransition() {
  const router = useRouter();
  const pathname = usePathname();

  const panel = useRef<HTMLDivElement | null>(null);
  const direction = useRef<SlideDetail["from"]>("right");
  const startedAt = useRef<string | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onSlide = (e: Event) => {
      const { href, from, back } = (e as CustomEvent<SlideDetail>).detail;

      // Nothing to hide if we are already there.
      if (!back && href === pathname) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (back) window.history.go(-back);
        else router.push(href);
        return;
      }
      // A second request mid-flight would leave two panels behind.
      if (panel.current) return;

      const el = document.createElement("div");
      el.className = "slide-panel";
      el.setAttribute("aria-hidden", "true");
      el.dataset.from = from;
      document.body.appendChild(el);
      panel.current = el;
      direction.current = from;
      startedAt.current = pathname;

      const enter = from === "right" ? "100%" : "-100%";
      el.animate(
        [{ transform: `translateX(${enter})` }, { transform: "translateX(0)" }],
        { duration: IN_MS, easing: "cubic-bezier(0.7, 0, 0.3, 1)", fill: "forwards" }
      );

      // Navigated while the panel is still travelling, so the fetch overlaps
      // the animation instead of following it.
      window.setTimeout(() => {
        if (back) window.history.go(-back);
        else router.push(href);
      }, IN_MS * 0.55);

      safety.current = setTimeout(clear, SAFETY_MS);
    };

    window.addEventListener(SLIDE_EVENT, onSlide);
    return () => window.removeEventListener(SLIDE_EVENT, onSlide);
  }, [router, pathname]);

  // The panel leaves once the new route has actually committed.
  useEffect(() => {
    const el = panel.current;
    if (!el || startedAt.current === null || startedAt.current === pathname) return;

    startedAt.current = null;
    if (safety.current) clearTimeout(safety.current);

    const exit = direction.current === "right" ? "-100%" : "100%";
    const anim = el.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(${exit})` }],
      { duration: OUT_MS, easing: "cubic-bezier(0.7, 0, 0.25, 1)", fill: "forwards" }
    );
    anim.addEventListener("finish", clear);
  }, [pathname]);

  function clear() {
    if (safety.current) clearTimeout(safety.current);
    safety.current = null;
    startedAt.current = null;
    panel.current?.remove();
    panel.current = null;
  }

  useEffect(() => clear, []);

  return null;
}
