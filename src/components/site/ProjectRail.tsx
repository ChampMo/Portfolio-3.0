"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ProjectDoc } from "@/models/Project";
import SplitText from "./SplitText";
import ViewAllOrb from "./ViewAllOrb";
import FilterLaunch, { type Facets } from "./FilterLaunch";

/* Depth falloff for cards either side of centre. Tuned so the leading card
   visibly grows as it travels in rather than arriving already at full size. */
const SCALE_PER_VW = 0.55;
const SCALE_MAX = 0.22;
const FADE_PER_VW = 1.2;
const FADE_MAX = 0.55;
const LIFT_PER_VW = 150;
const LIFT_MAX = 60;

const STATUS_STYLE: Record<string, string> = {
  DEPLOYED: "text-telemetry border-telemetry/45",
  IN_ORBIT: "text-signal border-signal/45",
  ARCHIVED: "text-ink-muted border-grid",
};

/**
 * Vertical scroll drives horizontal pan. The section is made tall enough to
 * absorb the track's overflow, its inner wrapper is sticky, and the track is
 * translated by the scroll progress through that extra height.
 *
 * Card geometry is computed from cached measurements rather than read per
 * frame — see the note in ParallaxProvider about layout thrashing.
 */
export default function ProjectRail({
  projects,
  total,
  facets,
}: {
  projects: ProjectDoc[];
  /** Size of the whole archive, not just the starred slice shown here. */
  total: number;
  /** Filter vocabulary drawn from every project, not only the starred ones. */
  facets: Facets;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(1);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const mobile = () => window.innerWidth <= 680;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let extra = 0;
    let sectionTop = 0;
    let sectionH = 0;
    let raf = 0;
    /** Cached per-card geometry, so render() never touches layout. */
    let cards: Array<{ el: HTMLElement; centre: number }> = [];

    function measure() {
      if (!section || !track) return;
      if (mobile()) {
        section.style.height = "";
        track.style.transform = "";
        extra = 0;
        cards = [];
        return;
      }

      // The lead-out spacer is a real child, so it is counted here — a
      // padding-right on the track would not have been.
      extra = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = `${window.innerHeight + extra}px`;

      // Measure each card where it actually sits rather than assuming a
      // uniform first-card-plus-index-times-step layout, which breaks the
      // moment spacers or an odd-width card enter the row.
      cards = Array.from(
        track.querySelectorAll<HTMLElement>("[data-rail-card]")
      ).map((el) => ({ el, centre: el.offsetLeft + el.offsetWidth / 2 }));

      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      sectionH = section.offsetHeight;
    }

    function render() {
      if (!track || extra <= 0 || sectionH <= window.innerHeight) {
        raf = requestAnimationFrame(render);
        return;
      }
      const p = Math.max(
        0,
        Math.min(1, (window.scrollY - sectionTop) / (sectionH - window.innerHeight))
      );
      const shift = -p * extra;
      track.style.transform = `translateX(${shift}px)`;
      setFill(p * 100);
      setIndex(Math.min(projects.length, Math.floor(p * (projects.length - 0.001)) + 1));

      if (!reduce) {
        const vw = window.innerWidth;
        for (const { el, centre } of cards) {
          const d = Math.abs(centre + shift - vw / 2) / vw;
          const scale = 1 - Math.min(SCALE_MAX, d * SCALE_PER_VW);
          const lift = Math.min(LIFT_MAX, d * LIFT_PER_VW);
          el.style.transform = `scale(${scale}) translateY(${lift}px)`;
          el.style.opacity = `${1 - Math.min(FADE_MAX, d * FADE_PER_VW)}`;
        }
      }
      raf = requestAnimationFrame(render);
    }

    measure();
    raf = requestAnimationFrame(render);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [projects.length]);

  if (projects.length === 0) return null;

  return (
    <section id="work" ref={sectionRef} className="relative">
      <div className="rail-sticky">
        <div className="relative z-[2] mb-9 px-[var(--pad-x)]">
          {/* Anchored to the header rather than to the sticky viewport box.
              Every other section puts this behind its own heading, but the
              rail's wrapper is a full-height sticky pane, so `top: 2rem` pinned
              the numeral to the top of the screen instead — far above the line
              it is meant to sit on. */}
          <span className="ghost-num is-rail" aria-hidden="true">04</span>
          <div className="mb-0 flex flex-wrap items-baseline gap-[18px]">
            <span className="font-mono text-[11px] tracking-[0.16em] tabular-nums text-signal">04</span>
            <h2 className="m-0 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              Mission Archives
            </h2>
            <span aria-hidden="true" className="h-px min-w-10 flex-1 bg-grid" />
          </div>
          <SplitText
            as="h3"
            text="Selected work"
            className="mt-6 block font-display text-[clamp(2rem,4.4vw,3.4rem)] uppercase leading-[0.95]"
          />
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-[10px] tracking-[0.14em] text-ink-muted">
            <span className="flex items-center gap-3.5">
              <span className="tabular-nums">{String(index).padStart(2, "0")}</span>
              <div className="relative h-px w-[190px] bg-grid">
                <div
                  className="absolute left-0 top-0 h-full bg-signal"
                  style={{ width: `${fill}%` }}
                />
              </div>
              <span className="tabular-nums">{String(projects.length).padStart(2, "0")}</span>
            </span>
            <FilterLaunch facets={facets} />
          </div>
        </div>

        <div className="rail-track" ref={trackRef}>
          <span className="rail-lead-in" aria-hidden="true" />
          {projects.map((p) => (
            <article
              key={p._id}
              data-rail-card
              data-cursor="VIEW"
              data-cursor-mode="ring"
              className="spot group/card relative flex w-[min(460px,80vw)] shrink-0 flex-col rounded-[16px] border border-grid bg-panel p-8 transition-colors hover:border-signal"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
            >
              <div className="relative z-[1] mb-6 flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.13em] text-ink-muted">
                <span className="truncate">
                  {p.codename || p.name.toUpperCase()} {p.year ? `· ${p.year}` : ""}
                </span>
                <span
                  className={`whitespace-nowrap rounded-full border px-2.5 py-1 ${
                    STATUS_STYLE[p.status] ?? STATUS_STYLE.ARCHIVED
                  }`}
                >
                  {p.status.replace("_", " ")}
                </span>
              </div>

              <div className="relative z-[1] mb-3 flex items-start gap-4">
                {p.coverImage ? (
                  // Arbitrary upload host — next/image would need every
                  // possible domain declared in remotePatterns.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImage}
                    alt=""
                    className="size-24 shrink-0 rounded-[10px] border border-grid object-cover"
                  />
                ) : null}
                <h4 className="min-w-0 font-display text-[2.5rem] uppercase leading-[0.92] break-words">
                  {p.name}
                </h4>
              </div>
              {p.summary ? (
                <p className="relative z-[1] mb-6 text-[15px] leading-relaxed text-ink-muted">
                  {p.summary}
                </p>
              ) : null}

              {p.highlights.length > 0 ? (
                <ul className="relative z-[1] m-0 mb-6 flex list-none flex-col gap-2 p-0">
                  {p.highlights.map((h) => (
                    <li key={h} className="relative pl-4 text-[13.5px] leading-snug text-ink-muted">
                      <span aria-hidden="true" className="absolute left-0 top-2 h-px w-1.5 bg-signal" />
                      {h}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="relative z-[1] mt-auto flex flex-wrap gap-[7px]">
                {p.stack.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-grid px-2.5 py-[5px] font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {p.slug ? (
                // Stretched link: covers the whole card for pointer and
                // keyboard use, while the card itself stays a plain element so
                // the horizontal drag/pan is unaffected.
                <Link
                  href={`/work/${p.slug}`}
                  data-cursor="VIEW"
                  className="absolute inset-0 z-[2] rounded-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                >
                  <span className="sr-only">View {p.name}</span>
                </Link>
              ) : null}

              {p.slug ? (
                <span
                  aria-hidden="true"
                  className="relative z-[1] mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors group-hover/card:text-signal"
                >
                  Read case study <span>&rarr;</span>
                </span>
              ) : null}
            </article>
          ))}
          <ViewAllOrb total={total} shown={projects.length} />
          <span className="rail-lead-out" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
