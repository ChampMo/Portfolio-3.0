"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

export type Facets = { tag: string[]; stack: string[]; status: string[] };

type Facet = keyof Facets;

const FACETS: Facet[] = ["tag", "stack", "status"];
const LABEL: Record<Facet, string> = { tag: "Tag", stack: "Stack", status: "Status" };

/**
 * Filter launcher for the home page rail.
 *
 * Picking parameters here and confirming jumps to the archive with those
 * filters already applied, so a visitor who knows what they are looking for
 * never has to scroll the rail at all.
 *
 * The panel is `fixed` rather than a dropdown under the button: the rail's
 * sticky wrapper sets `overflow: hidden` to contain the horizontal track, and
 * anything anchored inside it would be clipped.
 */
export default function FilterLaunch({ facets }: { facets: Facets }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Facets>({ tag: [], stack: [], status: [] });
  const [launching, setLaunching] = useState(false);

  const total = chosen.tag.length + chosen.stack.length + chosen.status.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle(facet: Facet, value: string) {
    setChosen((prev) => ({
      ...prev,
      [facet]: prev[facet].includes(value)
        ? prev[facet].filter((v) => v !== value)
        : [...prev[facet], value],
    }));
  }

  function launch() {
    const params = new URLSearchParams();
    for (const facet of FACETS) {
      if (chosen[facet].length) params.set(facet, chosen[facet].join(","));
    }
    const qs = params.toString();
    const href = qs ? `/work?${qs}` : "/work";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    // The sweep is a plain element rather than a route-level transition:
    // it has to outlive this component's unmount, so it is appended to
    // <body> and removes itself on its own timer.
    setLaunching(true);
    const sweep = document.createElement("div");
    sweep.className = "scan-sweep";
    document.body.appendChild(sweep);
    window.setTimeout(() => sweep.remove(), 700);
    window.setTimeout(() => router.push(href), 330);
  }

  const empty = FACETS.every((f) => facets[f].length === 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-cursor="FILTER"
        className="inline-flex items-center gap-2 rounded-full border border-grid px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
      >
        <SlidersHorizontal size={11} aria-hidden="true" />
        Filter
      </button>

      {open ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ground/80 backdrop-blur-[3px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Scan parameters"
            className="relative flex max-h-[82svh] w-[min(720px,100%)] flex-col overflow-hidden rounded-[16px] border border-grid bg-panel"
          >
            <div className="flex items-center justify-between gap-4 border-b border-grid px-6 py-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <span className="text-signal">04</span> &middot; Scan parameters
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="text-ink-muted transition-colors hover:text-signal"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
              {empty ? (
                <p className="text-sm text-ink-muted">
                  No tags or stack recorded yet — the archive opens unfiltered.
                </p>
              ) : (
                FACETS.map((facet) =>
                  facets[facet].length === 0 ? null : (
                    <div key={facet} className="flex flex-col gap-2.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                        {LABEL[facet]}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {facets[facet].map((value) => {
                          const on = chosen[facet].includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggle(facet, value)}
                              className={`rounded-full border px-3 py-[6px] font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                                on
                                  ? "border-signal bg-signal text-on-signal"
                                  : "border-grid text-ink-muted hover:border-ink-muted hover:text-ink"
                              }`}
                            >
                              {value.replace("_", " ")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-grid px-6 py-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                {total === 0 ? "No filter — all records" : `${total} selected`}
              </span>
              <button
                type="button"
                onClick={launch}
                disabled={launching}
                data-cursor="SCAN"
                className="inline-flex items-center gap-2.5 rounded-full border border-signal bg-signal px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-on-signal transition-opacity hover:opacity-85 disabled:opacity-60"
              >
                {launching ? "Scanning…" : "Initiate scan"}
                <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
