"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Extra fields this app writes onto each history entry's state. */
export type TrailState = {
  /** Path of the nearest earlier entry that is not a project page. */
  signalOrigin?: string | null;
  /** How many history steps back that entry is. */
  signalDepth?: number;
  /**
   * The immediately preceding path, with no skipping.
   *
   * Not the same question as `signalOrigin`. A project page wants the listing
   * it came in from, several steps back; the Deployment Bay — reachable from
   * the hero, the nav and a project's own page — just wants whatever the
   * visitor was looking at one moment ago.
   */
  signalPrev?: string | null;
};

export function readTrail(): TrailState {
  if (typeof window === "undefined") return {};
  return (window.history.state ?? {}) as TrailState;
}

const isProjectPage = (path: string) => /^\/work\/.+/.test(path);

/**
 * Tags every history entry with the way back out of the project pages.
 *
 * A plain "previous page" is not enough. Paging Agenda → ResumeHub →
 * Tech Balance makes the previous page another project, so one step back
 * lands on a project the visitor has already read rather than on the list
 * they came in from. What "back" should mean is: the listing this run of
 * project pages started from, however many of them were read since.
 *
 * So each entry records the nearest non-project page and its distance.
 * Arriving at a project from another project inherits the origin and adds a
 * step; arriving from anywhere else starts a fresh count.
 *
 * The pair is written into `history.state` rather than a single
 * sessionStorage slot because history state belongs to the *entry*: the
 * browser restores it on back and forward, so the numbers stay correct no
 * matter how the visitor moves through the stack. `document.referrer` cannot
 * do this either — it is fixed at document load and never updates during
 * client-side navigation.
 */
export default function RouteTrail() {
  const pathname = usePathname();
  const last = useRef<{ path: string; origin: string | null; depth: number } | null>(null);

  useEffect(() => {
    const state = readTrail();

    // Already tagged means this entry was reached by back/forward, not by a
    // new navigation. Trust what the browser restored and re-sync from it.
    if (state.signalOrigin !== undefined) {
      last.current = {
        path: pathname,
        origin: state.signalOrigin,
        depth: state.signalDepth ?? 0,
      };
      return;
    }

    const from = last.current;
    let origin: string | null = null;
    let depth = 0;

    if (from && from.path !== pathname) {
      if (isProjectPage(from.path)) {
        // Another project — carry its origin and count one more step.
        origin = from.origin;
        depth = origin ? from.depth + 1 : 0;
      } else {
        origin = from.path;
        depth = 1;
      }
    }

    try {
      window.history.replaceState(
        {
          ...window.history.state,
          signalOrigin: origin,
          signalDepth: depth,
          signalPrev: from && from.path !== pathname ? from.path : null,
        },
        ""
      );
    } catch {
      /* nothing to do — BackLink falls back to a plain link */
    }

    last.current = { path: pathname, origin, depth };
  }, [pathname]);

  return null;
}
