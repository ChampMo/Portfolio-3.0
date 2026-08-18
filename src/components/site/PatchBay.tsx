"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ServiceDoc } from "@/models/Service";
import { scrambleText } from "./Reveal";

const CYCLE_MS = 4500;

export type LinkedProject = { _id: string; name: string; slug?: string };

export default function PatchBay({
  services,
  projects = [],
}: {
  services: ServiceDoc[];
  projects?: LinkedProject[];
}) {
  const byId = new Map(projects.map((p) => [p._id, p]));
  const [active, setActive] = useState(0);
  /** Cleared for good once the visitor picks a channel deliberately. */
  const [auto, setAuto] = useState(true);
  /** Hovering the list freezes the countdown without ending it. */
  const [hover, setHover] = useState(false);
  const codeRef = useRef<HTMLSpanElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const barRef = useRef<HTMLDivElement | null>(null);
  /** Time spent on the current channel, carried across hover pauses. */
  const elapsed = useRef(0);

  // Re-scramble the channel code whenever the selection changes.
  useEffect(() => {
    if (codeRef.current) scrambleText(codeRef.current, true);
  }, [active]);

  // Auto-advance until the visitor picks a channel, pausing while the pointer
  // is over the list.
  useEffect(() => {
    const bar = barRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!auto || services.length < 2 || reduce) {
      if (bar) bar.style.transform = "scaleX(0)";
      return;
    }
    // Frozen, not stopped: the bar keeps whatever fill it had.
    if (hover) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;

      if (elapsed.current >= CYCLE_MS) {
        elapsed.current = 0;
        setActive((a) => (a + 1) % services.length);
      }

      // Written straight to the node. Holding this in state re-rendered every
      // channel and every panel sixty times a second to move one bar.
      if (bar) {
        bar.style.transform = `scaleX(${Math.min(1, elapsed.current / CYCLE_MS)})`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto, hover, services.length]);

  /** Deliberate choice — click or keyboard. Ends the auto-advance. */
  function select(i: number) {
    setAuto(false);
    elapsed.current = 0;
    setActive(i);
  }

  /**
   * Hover preview. Explicitly NOT `select`: pointing at a channel to read it
   * is not the same as choosing one, and treating it as such meant a pointer
   * crossing the list on its way somewhere else killed the countdown for the
   * rest of the visit — which is why the bar looked broken.
   */
  function preview(i: number) {
    elapsed.current = 0;
    setActive(i);
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const delta =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + services.length) % services.length;
    select(next);
    tabRefs.current[next]?.focus();
  }

  if (services.length === 0) return null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[290px_1fr]" data-reveal>
      {/* channel selector */}
      <div className="overflow-hidden rounded-card border border-grid bg-panel">
        <div className="hidden items-center justify-between border-b border-grid px-4 py-3 font-mono text-[10px] tracking-[0.16em] text-ink-muted lg:flex">
          <span>CHANNEL SELECT</span>
          <span className="tabular-nums">{String(services.length).padStart(2, "0")}</span>
        </div>

        <div
          role="tablist"
          aria-label="Service channels"
          aria-orientation="vertical"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="flex overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          {services.map((svc, i) => {
            const on = i === active;
            return (
              <button
                key={svc._id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`bay-tab-${i}`}
                aria-selected={on}
                aria-controls={`bay-panel-${i}`}
                tabIndex={on ? 0 : -1}
                data-cursor="PATCH"
                onClick={() => select(i)}
                onMouseEnter={() => preview(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`relative flex w-full items-center gap-3 whitespace-nowrap border-grid px-4 py-4 text-left font-mono text-[11px] tracking-[0.1em] transition-colors lg:border-b ${
                  on ? "bg-panel-2 text-ink" : "text-ink-muted hover:bg-panel-2 hover:text-ink"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 h-full w-[2px] origin-center bg-signal transition-transform duration-300 ${
                    on ? "scale-y-100" : "scale-y-0"
                  }`}
                />
                <span className={`tabular-nums ${on ? "text-signal" : ""}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 uppercase">{svc.code || svc.name}</span>
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full transition-all ${
                    on ? "bg-signal ring-[3px] ring-signal/25" : "bg-grid"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Countdown to the next channel. scaleX rather than width — width is
            a layout property and animating it per frame is the expensive way
            to move a two-pixel bar. No CSS transition: the rAF loop already
            supplies every frame, and a transition on top only adds lag. */}
        <div className="hidden h-0.5 bg-grid lg:block" aria-hidden="true">
          <div
            ref={barRef}
            className="h-full origin-left bg-signal opacity-55"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>

      {/* readout — all panels share one grid cell so height never jumps */}
      <div className="grid overflow-hidden rounded-card border border-grid bg-panel" data-px="0.07">
        {services.map((svc, i) => {
          const on = i === active;
          return (
            <div
              key={svc._id}
              role="tabpanel"
              id={`bay-panel-${i}`}
              aria-labelledby={`bay-tab-${i}`}
              // `inert` rather than `hidden`: display:none would collapse the
              // shared grid cell and the panel height would jump on every switch.
              inert={!on}
              aria-hidden={!on}
              className={`col-start-1 row-start-1 p-8 transition-all duration-400 ${
                on ? "opacity-100 translate-y-0" : "pointer-events-none translate-y-2.5 opacity-0"
              }`}
            >
              <div className="mb-6 flex items-center justify-between gap-3.5 font-mono text-[10px] tracking-[0.14em] text-ink-muted">
                <span ref={on ? codeRef : undefined}>
                  SVC / {String(i + 1).padStart(2, "0")} &mdash; {svc.code || "—"}
                </span>
                <span className="inline-flex items-center gap-[7px] text-signal">
                  <span className="status-dot" aria-hidden="true" />
                  PATCHED
                </span>
              </div>

              <h4 className="mb-2.5 font-display text-[clamp(1.9rem,3.4vw,2.7rem)] uppercase leading-[0.95]">
                {svc.name}
              </h4>
              {svc.tagline ? (
                <p className="mb-4 font-mono text-xs tracking-[0.06em] text-signal">
                  {svc.tagline}
                </p>
              ) : null}
              {svc.description ? (
                <p className="mb-7 max-w-[56ch] text-[15px] leading-[1.7] text-ink-muted">
                  {svc.description}
                </p>
              ) : null}

              {(() => {
                const linked = (svc.linkedProjectIds ?? [])
                  .map((id) => byId.get(String(id)))
                  .filter((p): p is LinkedProject => Boolean(p));
                if (linked.length === 0) return null;
                return (
                  <div className="mb-7">
                    <div className="mb-3 border-t border-grid pt-5 font-mono text-[10px] tracking-[0.16em] text-ink-muted">
                      RELATED WORK
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {linked.map((p) =>
                        p.slug ? (
                          <Link
                            key={p._id}
                            href={`/work/${p.slug}`}
                            data-cursor="VIEW"
                            className="group inline-flex items-center gap-2 rounded-full border border-grid px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
                          >
                            {p.name}
                            <span
                              aria-hidden="true"
                              className="transition-transform group-hover:translate-x-0.5"
                            >
                              &rarr;
                            </span>
                          </Link>
                        ) : (
                          <span
                            key={p._id}
                            className="rounded-full border border-grid px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted"
                          >
                            {p.name}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })()}

              {svc.deliverables.length > 0 ? (
                <>
                  <div className="mb-4 border-t border-grid pt-5 font-mono text-[10px] tracking-[0.16em] text-ink-muted">
                    DELIVERABLES
                  </div>
                  <ul className="m-0 list-none p-0 pl-1">
                    {svc.deliverables.map((d, di) => (
                      <li
                        key={d}
                        className="relative mb-[11px] pl-[22px] text-sm leading-relaxed text-ink-muted last:mb-0"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute left-0 top-0 w-px bg-grid ${
                            di === svc.deliverables.length - 1 ? "h-[0.65em]" : "bottom-1/2"
                          }`}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-[0.62em] h-px w-3 bg-signal"
                        />
                        {d}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
