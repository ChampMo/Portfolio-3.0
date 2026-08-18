"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Ticking local time for the telemetry rail.
 *
 * Modelled as an external store rather than useState + useEffect: the clock is
 * a genuinely external source, and `useSyncExternalStore` gives a dedicated
 * server snapshot so SSR renders a placeholder instead of a server-timezone
 * time that would mismatch on hydration.
 *
 * The factory lives at module scope so its mutable `snapshot` is not created
 * during render — mutating render-scope state is what the immutability lint
 * rule (rightly) rejects.
 */
const PLACEHOLDER = "--:--:--";

function createClockStore(timezone: string) {
  const format = () => {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
    } catch {
      // An invalid IANA name would otherwise throw on every tick.
      return new Date().toLocaleTimeString("en-GB", { hour12: false });
    }
  };

  let snapshot = PLACEHOLDER;

  return {
    subscribe(onChange: () => void) {
      snapshot = format();
      onChange();
      const id = setInterval(() => {
        snapshot = format();
        onChange();
      }, 1000);
      return () => clearInterval(id);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => PLACEHOLDER,
  };
}

export default function LiveClock({ timezone }: { timezone: string }) {
  const store = useMemo(() => createClockStore(timezone), [timezone]);

  const time = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  return (
    <span className="boot tabular-nums" style={{ ["--d" as string]: ".67s" }}>
      {time}
    </span>
  );
}
