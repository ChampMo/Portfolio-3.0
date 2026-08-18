"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { ProjectDoc } from "@/models/Project";

const STATUS_STYLE: Record<string, string> = {
  DEPLOYED: "text-telemetry border-telemetry/45",
  IN_ORBIT: "text-signal border-signal/45",
  ARCHIVED: "text-ink-muted border-grid",
};

/**
 * One record in the archive grid.
 *
 * Three effects layer here, all of them opt-out under reduced motion:
 *  - the cover arrives desaturated and is "developed" by a scan line the
 *    first time the card reaches the viewport (`.is-scanned`);
 *  - the card tilts a few degrees toward the pointer, on top of the existing
 *    `.spot` highlight;
 *  - clicking expands the card toward the middle of the screen before the
 *    route changes, so the detail page feels opened rather than jumped to.
 *
 * The expand deliberately does not use the View Transitions API: the route
 * change is async, browser support is uneven, and a hand-run animation is
 * predictable everywhere.
 */
export default function ArchiveCard({
  project,
  scanDelay = 0,
}: {
  project: ProjectDoc;
  /** Staggers the scan-line so a screenful develops in sequence. */
  scanDelay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const href = project.slug ? `/work/${project.slug}` : null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-scanned");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          window.setTimeout(() => el.classList.add("is-scanned"), scanDelay);
          io.unobserve(el);
        }
      },
      { rootMargin: "-8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scanDelay]);

  function open(e: React.MouseEvent) {
    if (!href) return;
    // Let modified clicks behave like a normal link (new tab, etc.).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();

    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    const r = el.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (r.left + r.width / 2);
    const dy = window.innerHeight / 2 - (r.top + r.height / 2);

    document.documentElement.classList.add("archive-opening");
    el.style.position = "relative";
    // Above the dimming layer *and* above the sticky header and filter deck,
    // which sit at z-50 and z-40 in the same root stacking context.
    el.style.zIndex = "95";

    const anim = el.animate(
      [
        { transform: "none" },
        { transform: `translate(${dx}px, ${dy}px) scale(1.12)` },
      ],
      { duration: 420, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" }
    );

    // Navigating on `finish` rather than on a shorter timer: cutting away
    // mid-flight is what made the card look like it stopped halfway.
    anim.addEventListener("finish", () => {
      router.push(href);
      // The class lives on <html>, which survives the route change, so
      // nothing else would ever take it off.
      window.setTimeout(
        () => document.documentElement.classList.remove("archive-opening"),
        450
      );
    });
  }

  return (
    <article
      ref={ref}
      data-flip-id={project._id}
      data-cursor="VIEW"
      data-cursor-mode="ring"
      onMouseMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
        el.style.setProperty("--tilt-x", `${(-py * 5).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${(px * 6).toFixed(2)}deg`);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.setProperty("--tilt-x", "0deg");
        e.currentTarget.style.setProperty("--tilt-y", "0deg");
      }}
      className="spot arc-card group flex h-full flex-col rounded-[16px] border border-grid bg-panel p-6 transition-colors hover:border-signal"
    >
      <div className="relative z-[1] mb-4 flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.13em] text-ink-muted">
        <span className="truncate">
          {project.codename || project.name.toUpperCase()}
          {project.year ? ` · ${project.year}` : ""}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {project.featured ? (
            <Star size={11} aria-label="Featured" className="text-signal" fill="currentColor" />
          ) : null}
          <span
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 ${
              STATUS_STYLE[project.status] ?? STATUS_STYLE.ARCHIVED
            }`}
          >
            {project.status.replace("_", " ")}
          </span>
        </span>
      </div>

      {project.coverImage ? (
        <div className="scan relative z-[1] mb-4 overflow-hidden rounded-[10px] border border-grid">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.coverImage} alt="" className="aspect-[16/10] w-full object-cover" />
          <span className="scan-line" aria-hidden="true" />
        </div>
      ) : null}

      <h2 className="relative z-[1] mb-3 break-words font-display text-[1.7rem] uppercase leading-[0.95]">
        {project.name}
      </h2>

      {project.summary ? (
        <p className="relative z-[1] mb-5 text-[14px] leading-relaxed text-ink-muted">
          {project.summary}
        </p>
      ) : null}

      <div className="relative z-[1] mt-auto flex flex-wrap gap-[6px]">
        {project.stack.slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-full border border-grid px-2.5 py-[4px] font-mono text-[9px] uppercase tracking-[0.08em] text-ink-muted"
          >
            {t}
          </span>
        ))}
        {project.stack.length > 4 ? (
          <span className="px-1 py-[4px] font-mono text-[9px] text-ink-muted/60">
            +{project.stack.length - 4}
          </span>
        ) : null}
      </div>

      {href ? (
        <a
          href={href}
          onClick={open}
          data-cursor="VIEW"
          className="absolute inset-0 z-[2] rounded-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
        >
          <span className="sr-only">View {project.name}</span>
        </a>
      ) : null}
    </article>
  );
}
