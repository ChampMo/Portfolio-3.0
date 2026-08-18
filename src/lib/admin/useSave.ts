"use client";

import { useCallback, useRef, useState } from "react";
import type { SaveState } from "@/components/admin/ui";

/**
 * Wraps a fetch-and-report cycle: sets state, surfaces the server's error
 * message, and clears the "Saved" flag after a moment so the bar does not sit
 * there claiming success forever.
 */
export function useSave() {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);

  const run = useCallback(
    async (input: RequestInfo, init: RequestInit): Promise<unknown | null> => {
      if (timer.current) window.clearTimeout(timer.current);
      setState("saving");
      setError("");

      try {
        const res = await fetch(input, {
          ...init,
          headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };

        if (!res.ok) {
          setError(body.error || `Request failed (${res.status})`);
          setState("error");
          return null;
        }

        setState("saved");
        timer.current = window.setTimeout(() => setState("idle"), 2500);
        return body;
      } catch {
        setError("Network error");
        setState("error");
        return null;
      }
    },
    []
  );

  return { state, error, run };
}
