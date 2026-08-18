"use client";

import { useEffect } from "react";

/**
 * Adds `.is-in` to `[data-reveal]` elements as they enter view, and runs the
 * glyph-scramble on `[data-scramble]` once. One observer for the whole page.
 */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%*+=";

export function scrambleText(el: HTMLElement, force = false) {
  if (el.dataset.scrambled && !force) return;
  el.dataset.scrambled = "1";

  const final = el.dataset.finalText ?? el.textContent ?? "";
  el.dataset.finalText = final;

  const existing = Number(el.dataset.scrambleTimer ?? 0);
  if (existing) window.clearInterval(existing);

  let frame = 0;
  const total = final.length * 2 + 10;
  const timer = window.setInterval(() => {
    let out = "";
    for (let i = 0; i < final.length; i++) {
      if (final[i] === " ") {
        out += " ";
      } else {
        out += i * 2 < frame ? final[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    el.textContent = out;
    if (++frame > total) {
      window.clearInterval(timer);
      el.textContent = final;
    }
  }, 28);

  el.dataset.scrambleTimer = String(timer);
}

export default function Reveal() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reduce) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add("is-in");
          el.querySelectorAll<HTMLElement>("[data-scramble]").forEach((s) =>
            scrambleText(s)
          );
          io.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 60}ms`;
      io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return null;
}
