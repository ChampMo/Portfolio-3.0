"use client";

import { useSyncExternalStore } from "react";

/**
 * "light" or "dark", whichever the page is actually showing.
 *
 * Three states have to collapse into two: an explicit `.light` / `.dark` class
 * on <html> wins, and otherwise the OS preference decides. Both can change
 * while the page is open — the toggle writes the class, the OS fires a media
 * query — so both are subscribed to.
 */
function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);

  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => {
    mq.removeEventListener("change", onChange);
    mo.disconnect();
  };
}

function snapshot(): "light" | "dark" {
  const root = document.documentElement;
  if (root.classList.contains("light")) return "light";
  if (root.classList.contains("dark")) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, snapshot, () => "dark");
}
