"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, List, Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import type { ProjectDoc } from "@/models/Project";
import { useGridFlip } from "@/lib/site/useGridFlip";
import ArchiveCard from "./ArchiveCard";
import ArchiveIndex from "./ArchiveIndex";

type Facet = "tag" | "stack" | "status";
type Mode = "grid" | "index";

export type ArchiveFilters = Record<Facet, string[]> & { q: string };

const FACETS: Facet[] = ["tag", "stack", "status"];

const FACET_LABEL: Record<Facet, string> = {
  tag: "Tag",
  stack: "Stack",
  status: "Status",
};

/** Values a project offers to a given facet. */
function valuesFor(p: ProjectDoc, facet: Facet): string[] {
  if (facet === "tag") return p.tags;
  if (facet === "stack") return p.stack;
  return [p.status];
}

const norm = (s: string) => s.trim().toLowerCase();

function matchesFacet(p: ProjectDoc, facet: Facet, chosen: string[]): boolean {
  // An empty selection means "no opinion", not "match nothing".
  if (chosen.length === 0) return true;
  const mine = new Set(valuesFor(p, facet).map(norm));
  return chosen.some((c) => mine.has(norm(c)));
}

function matchesQuery(p: ProjectDoc, q: string): boolean {
  if (!q) return true;
  const hay = [p.name, p.codename, p.summary, p.role, p.year, ...p.stack, ...p.tags]
    .join(" ")
    .toLowerCase();
  return hay.includes(norm(q));
}

/**
 * The archive control deck.
 *
 * Filtering runs client-side over the full published list rather than as a
 * request per chip press: the whole point of the re-layout animation is that
 * results rearrange instantly, and a round-trip would put a stall in the
 * middle of it.
 *
 * Facet logic follows the convention every shopping site has already taught
 * visitors — OR inside a facet, AND across facets. Picking "AI" and
 * "Frontend" widens the results; adding "Next.js" on top narrows them.
 *
 * Selections are mirrored into the URL so a filtered view can be linked. That
 * goes through `replaceState` rather than a router navigation: pushing an
 * entry per chip would bury the previous page under a dozen history steps,
 * and re-rendering the server component would throw away the animation.
 */
export default function ArchiveDeck({
  projects,
  initial,
}: {
  projects: ProjectDoc[];
  initial: ArchiveFilters;
}) {
  const [chosen, setChosen] = useState<Record<Facet, string[]>>({
    tag: initial.tag,
    stack: initial.stack,
    status: initial.status,
  });
  const [q, setQ] = useState(initial.q);
  const [mode, setMode] = useState<Mode>("grid");
  /** True once the deck has stuck to the top and the results are scrolling. */
  const [stuck, setStuck] = useState(false);
  /** Forced open while stuck, until the visitor closes it again. */
  const [pinned, setPinned] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);
  const scrollRef = useRef<HTMLSpanElement | null>(null);
  const shownCount = useRef(-1);

  /** Every value that appears anywhere, most-used first. */
  const options = useMemo(() => {
    const out = {} as Record<Facet, string[]>;
    for (const facet of FACETS) {
      const tally = new Map<string, { label: string; n: number }>();
      for (const p of projects) {
        for (const v of valuesFor(p, facet)) {
          if (!v) continue;
          const hit = tally.get(norm(v));
          if (hit) hit.n += 1;
          else tally.set(norm(v), { label: v, n: 1 });
        }
      }
      out[facet] = [...tally.values()].sort((a, b) => b.n - a.n).map((t) => t.label);
    }
    return out;
  }, [projects]);

  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          matchesFacet(p, "tag", chosen.tag) &&
          matchesFacet(p, "stack", chosen.stack) &&
          matchesFacet(p, "status", chosen.status) &&
          matchesQuery(p, q)
      ),
    [projects, chosen, q]
  );

  /**
   * How many results a chip would yield — counted with its own facet's
   * selection ignored. Counting against the final result set instead would
   * show 0 next to every unpicked chip the moment anything is selected,
   * which is worse than showing no number at all.
   */
  const counts = useMemo(() => {
    const out = {} as Record<Facet, Record<string, number>>;
    for (const facet of FACETS) {
      const others = FACETS.filter((f) => f !== facet);
      const pool = projects.filter(
        (p) => others.every((f) => matchesFacet(p, f, chosen[f])) && matchesQuery(p, q)
      );
      const tally: Record<string, number> = {};
      for (const value of options[facet]) {
        tally[value] = pool.filter((p) =>
          valuesFor(p, facet).some((v) => norm(v) === norm(value))
        ).length;
      }
      out[facet] = tally;
    }
    return out;
  }, [projects, options, chosen, q]);

  const ids = visible.map((p) => p._id);
  const { capture, overlay } = useGridFlip(gridRef, ids);

  const activeCount =
    chosen.tag.length + chosen.stack.length + chosen.status.length + (q ? 1 : 0);

  function toggle(facet: Facet, value: string) {
    capture();
    setChosen((prev) => {
      const has = prev[facet].some((v) => norm(v) === norm(value));
      return {
        ...prev,
        [facet]: has
          ? prev[facet].filter((v) => norm(v) !== norm(value))
          : [...prev[facet], value],
      };
    });
  }

  function clearAll() {
    capture();
    setChosen({ tag: [], stack: [], status: [] });
    setQ("");
  }

  // Mirror the selection into the address bar.
  useEffect(() => {
    const params = new URLSearchParams();
    for (const facet of FACETS) {
      if (chosen[facet].length) params.set(facet, chosen[facet].join(","));
    }
    if (q) params.set("q", q);
    const qs = params.toString();
    // Carries the existing state forward. Passing `null` here would wipe both
    // the router's own entry data and the back-trail tags RouteTrail writes,
    // breaking the return path from a project page.
    window.history.replaceState(
      window.history.state,
      "",
      qs ? `/work?${qs}` : "/work"
    );
  }, [chosen, q]);

  // Roll the result count rather than snapping it.
  useEffect(() => {
    const el = countRef.current;
    if (!el) return;
    const to = visible.length;
    const from = shownCount.current < 0 ? 0 : shownCount.current;
    shownCount.current = to;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || from === to) {
      el.textContent = String(to).padStart(2, "0");
      return;
    }

    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 520);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(from + (to - from) * eased)).padStart(2, "0");
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible.length]);

  // Scroll readout for the telemetry rail. Written to the node directly —
  // this fires constantly and must not re-render the results.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
        el.textContent = `${String(pct).padStart(3, "0")}%`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /**
   * Collapses the facet rows once the deck sticks to the top.
   *
   * Three rows of chips is the right size when you arrive and are choosing
   * what to look at; once you are reading results it is a wall taking a third
   * of the viewport with it. Scrolling therefore folds it down to the search
   * row, and the FILTERS button opens it again in place.
   *
   * Driven by a sentinel above the deck rather than a scroll listener: the
   * browser reports the crossing once, instead of the page recomputing a
   * threshold on every frame of every scroll.
   */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Fire the moment the deck actually sticks, which is when the sentinel
    // reaches the underside of the header rather than the top of the viewport.
    const headHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;

    const io = new IntersectionObserver(
      ([entry]) => {
        const off = !entry.isIntersecting;
        setStuck(off);
        // Returning to the top hands control back to the automatic behaviour,
        // so a filter panel opened earlier does not stay pinned open forever.
        if (!off) setPinned(false);
      },
      { rootMargin: `-${Math.round(headHeight)}px 0px 0px 0px` }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  /**
   * Parks the deck exactly under the page header, whatever height it is.
   *
   * This offset was written as a literal `top-[57px]`. The header is padding
   * plus a 32px control plus its border — 73px — and the literal never grew
   * with it, so the deck came to rest sixteen pixels *behind* the header:
   * its own top row of chips was tucked out of sight, and it covered more of
   * the results than its visible height suggested. Measuring means the two
   * cannot drift apart again, including if the header ever wraps on a narrow
   * window. Written straight to the node, so no scroll or resize re-renders
   * the results underneath.
   */
  useEffect(() => {
    const deck = deckRef.current;
    const header = document.querySelector("header");
    if (!deck || !header) return;

    const apply = () => {
      const h = Math.round(header.getBoundingClientRect().height);
      // A zero measurement means the header has no layout yet — a hidden tab,
      // a print pass. Writing it would park the deck at the very top, right
      // over the header, which is worse than the stylesheet's fallback.
      if (h > 0) deck.style.top = `${h}px`;
    };
    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  const collapsed = stuck && !pinned;
  const activeLabels = [...chosen.tag, ...chosen.stack, ...chosen.status];

  return (
    <>
      {overlay}

      {/* Watched by the observer above; the deck is stuck once this leaves. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      <div
        ref={deckRef}
        // `top` is set from the header's measured height on mount; this is the
        // pre-hydration fallback, close enough that nothing jumps visibly.
        className="sticky top-[73px] z-40 border-b border-grid bg-ground/90 backdrop-blur-[10px]"
      >
        <div
          className={`mx-auto flex max-w-[1240px] flex-col px-[var(--pad-x)] transition-[padding,gap] duration-300 ${
            collapsed ? "gap-0 py-3" : "gap-3 py-5"
          }`}
        >
          {/* A 0fr grid row rather than max-height: the rows collapse to
              exactly their own height with no magic number to keep in step
              with however many facets end up having options. */}
          <div
            inert={collapsed}
            aria-hidden={collapsed}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
              collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {FACETS.map((facet) =>
            options[facet].length === 0 ? null : (
              <div key={facet} className="flex flex-wrap items-center gap-2">
                <span className="w-[52px] shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  {FACET_LABEL[facet]}
                </span>
                {options[facet].map((value) => {
                  const on = chosen[facet].some((v) => norm(v) === norm(value));
                  const n = counts[facet][value] ?? 0;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(facet, value)}
                      data-cursor={on ? "DROP" : "ADD"}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-[5px] font-mono text-[10px] uppercase tracking-[0.08em] transition-all ${
                        on
                          ? "border-signal bg-signal text-on-signal"
                          : n === 0
                            ? "border-grid text-ink-muted/35"
                            : "border-grid text-ink-muted hover:border-ink-muted hover:text-ink"
                      }`}
                    >
                      {value.replace("_", " ")}
                      <span className="tabular-nums opacity-70">{n}</span>
                    </button>
                  );
                })}
              </div>
            )
          )}
            </div>
          </div>

          <div
            className={`flex flex-wrap items-center gap-3 transition-[padding] duration-300 ${
              collapsed ? "pt-0" : "pt-1"
            }`}
          >
            <label className="flex min-w-[210px] flex-1 items-center gap-2 rounded-full border border-grid px-3.5 py-2 focus-within:border-signal">
              <Search size={12} aria-hidden="true" className="shrink-0 text-ink-muted" />
              <span className="sr-only">Search the archive</span>
              <input
                value={q}
                onChange={(e) => {
                  capture();
                  setQ(e.target.value);
                }}
                placeholder="SEARCH RECORDS…"
                className="w-full bg-transparent font-mono text-[10px] uppercase tracking-[0.1em] text-ink outline-none placeholder:text-ink-muted/50"
              />
            </label>

            {activeCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                data-cursor="RESET"
                className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-danger transition-colors hover:bg-danger/10"
              >
                <X size={11} aria-hidden="true" />
                Clear {activeCount}
              </button>
            ) : null}

            {/* Only worth showing once the rows it controls are out of view. */}
            {stuck ? (
              <button
                type="button"
                onClick={() => setPinned((v) => !v)}
                aria-expanded={!collapsed}
                data-cursor={collapsed ? "OPEN" : "CLOSE"}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                  activeCount > 0
                    ? "border-signal text-signal"
                    : "border-grid text-ink-muted hover:border-ink-muted hover:text-ink"
                }`}
              >
                <SlidersHorizontal size={11} aria-hidden="true" />
                Filters
                {activeCount > 0 ? (
                  <span className="tabular-nums opacity-70">{activeCount}</span>
                ) : null}
                <ChevronDown
                  size={11}
                  aria-hidden="true"
                  className={`transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
                />
              </button>
            ) : null}

            <div className="flex items-center gap-1 rounded-full border border-grid p-1">
              {([
                ["grid", LayoutGrid],
                ["index", List],
              ] as const).map(([m, Icon]) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                    mode === m ? "bg-panel-2 text-signal" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon size={11} aria-hidden="true" />
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside
        aria-hidden="true"
        className="pointer-events-none fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-2 font-mono text-[9px] tracking-[0.14em] text-ink-muted/70 xl:flex"
      >
        <span className="text-signal">SCAN</span>
        <span className="tabular-nums" ref={scrollRef}>
          000%
        </span>
        <span aria-hidden="true" className="my-1 h-14 w-px bg-grid" />
        <span className="tabular-nums">
          {String(visible.length).padStart(2, "0")}/{String(projects.length).padStart(2, "0")}
        </span>
        <span className="max-w-[9rem] text-right leading-relaxed">
          {activeLabels.length > 0
            ? activeLabels.join(" + ").toUpperCase()
            : q
              ? `"${q.toUpperCase()}"`
              : "NO FILTER"}
        </span>
      </aside>

      <section className="mx-auto max-w-[1240px] px-[var(--pad-x)] pb-24 pt-10">
        <p className="mb-7 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          <span ref={countRef} className="tabular-nums text-signal">
            {String(visible.length).padStart(2, "0")}
          </span>{" "}
          of {String(projects.length).padStart(2, "0")} records
        </p>

        {visible.length === 0 ? (
          <div className="relative grid min-h-[46vh] place-items-center overflow-hidden rounded-[16px] border border-grid bg-panel">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(520px,86%)] -translate-x-1/2 -translate-y-1/2 opacity-70"
              aria-hidden="true"
            >
              <div className="radar-rings" />
              <div className="radar-sweep" />
            </div>
            <div className="relative z-[1] px-6 text-center">
              <p className="mb-3 font-display text-[clamp(2rem,5vw,3.4rem)] uppercase leading-none text-ink-muted/70">
                No signal
              </p>
              <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                Nothing matches these parameters
              </p>
              <button
                type="button"
                onClick={clearAll}
                data-cursor="RESET"
                className="rounded-full border border-signal px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal hover:text-on-signal"
              >
                Reset parameters
              </button>
            </div>
          </div>
        ) : (
          <div ref={gridRef}>
            {mode === "grid" ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p, i) => (
                  <ArchiveCard key={p._id} project={p} scanDelay={(i % 6) * 90} />
                ))}
              </div>
            ) : (
              <ArchiveIndex projects={visible} />
            )}
          </div>
        )}
      </section>
    </>
  );
}
