"use client";

import { useMemo, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./ThemeInit";
import { runThemeWipe } from "@/lib/site/themeWipe";

type Theme = "light" | "dark";

function computeTheme(): Theme {
  const root = document.documentElement;
  if (root.classList.contains("light")) return "light";
  if (root.classList.contains("dark")) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Modelled as an external store for the same reason as LiveClock: the theme
 * class lives on `<html>`, outside React, and reading it during render would
 * mismatch the server-rendered HTML (there is no DOM to read on the server).
 * `useSyncExternalStore`'s dedicated server snapshot solves that cleanly.
 *
 * The store also listens for OS theme changes so the icon stays correct while
 * no explicit choice has been made yet (i.e. before the visitor's first click).
 */
function createThemeStore() {
  let snapshot: Theme = "dark";
  // The listener registered by useSyncExternalStore's `subscribe` call, kept
  // here so `setExplicit` (fired from a click handler, not from `subscribe`)
  // can also trigger a re-render.
  let listener: (() => void) | null = null;

  function recompute() {
    snapshot = computeTheme();
    listener?.();
  }

  return {
    subscribe(onChange: () => void) {
      listener = onChange;
      recompute();
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      mq.addEventListener("change", recompute);
      return () => {
        mq.removeEventListener("change", recompute);
        listener = null;
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: (): Theme => "dark",
    setExplicit(next: Theme) {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Private browsing / storage disabled: the class still applies for
        // this page load, it just won't persist across visits.
      }
      recompute();
    },
  };
}

/**
 * Explicit two-state toggle. There is no UI path back to "follow system" by
 * design — once a visitor picks a theme, that choice should stick.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const store = useMemo(() => createThemeStore(), []);
  const theme = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    // The circle grows from the button itself, so the change reads as coming
    // from the control the visitor just pressed.
    const r = e.currentTarget.getBoundingClientRect();
    runThemeWipe({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, () =>
      store.setExplicit(theme === "dark" ? "light" : "dark")
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title="Toggle theme"
      className={`grid size-8 shrink-0 place-items-center rounded-full border border-grid text-ink-muted transition-colors hover:border-signal hover:text-signal ${className}`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
