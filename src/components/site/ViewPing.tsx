"use client";

import { useEffect } from "react";

/**
 * Records one detail-page open.
 *
 * Fired from the client rather than during the server render: a server-side
 * increment would also count Next's route prefetches and any bot that touches
 * the HTML, which would make the number meaningless. The sessionStorage guard
 * stops a reload or a back-and-forth within one visit counting twice.
 */
export default function ViewPing({ id }: { id: string }) {
  useEffect(() => {
    if (!id) return;
    const key = `signal-viewed-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable — counting once per load is still better than not
      // counting at all.
    }
    const t = window.setTimeout(() => {
      fetch(`/api/projects/${id}/view`, { method: "POST", keepalive: true }).catch(
        () => {}
      );
    }, 1200);
    return () => window.clearTimeout(t);
  }, [id]);

  return null;
}
