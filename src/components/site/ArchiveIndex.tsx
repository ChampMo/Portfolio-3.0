"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import type { ProjectDoc } from "@/models/Project";

const STATUS_TONE: Record<string, string> = {
  DEPLOYED: "text-telemetry",
  IN_ORBIT: "text-signal",
  ARCHIVED: "text-ink-muted",
};

/**
 * Dense table view of the same records.
 *
 * The grid is for browsing; this is for scanning a long archive — every row
 * on one line, sortable by eye. The cover only appears as a preview plate
 * that trails the pointer, so the density is never paid for in lost imagery.
 */
export default function ArchiveIndex({ projects }: { projects: ProjectDoc[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      onMouseMove={(e) => {
        const plate = plateRef.current;
        if (!plate) return;
        // Written straight to the node: this fires on every pointer move and
        // has no business re-rendering the table.
        plate.style.transform = `translate(${e.clientX + 26}px, ${e.clientY - 90}px)`;
      }}
      onMouseLeave={() => setPreview(null)}
    >
      <ul className="m-0 list-none border-t border-grid p-0">
        {projects.map((p, i) => (
          <li key={p._id} data-flip-id={p._id}>
            <Link
              href={p.slug ? `/work/${p.slug}` : "#"}
              data-cursor="OPEN"
              onMouseEnter={() => setPreview(p.coverImage || null)}
              className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-grid py-4 transition-colors hover:bg-panel sm:grid-cols-[2.5rem_minmax(0,1.6fr)_minmax(0,1fr)_4.5rem_7rem]"
            >
              <span className="font-mono text-[11px] tabular-nums text-ink-muted transition-colors group-hover:text-signal">
                {String(i + 1).padStart(2, "0")}
              </span>

              <span className="flex min-w-0 items-center gap-2">
                {p.featured ? (
                  <Star size={10} aria-label="Featured" className="shrink-0 text-signal" fill="currentColor" />
                ) : null}
                <span className="truncate font-display text-[1.25rem] uppercase leading-none transition-transform duration-300 group-hover:translate-x-1.5">
                  {p.name}
                </span>
              </span>

              <span className="col-span-2 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted sm:col-span-1">
                {p.stack.slice(0, 3).join(" · ")}
              </span>

              <span className="hidden font-mono text-[11px] tabular-nums text-ink-muted sm:block">
                {p.year || "—"}
              </span>

              <span
                className={`hidden text-right font-mono text-[10px] tracking-[0.1em] sm:block ${
                  STATUS_TONE[p.status] ?? STATUS_TONE.ARCHIVED
                }`}
              >
                {p.status.replace("_", " ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div
        ref={plateRef}
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 top-0 z-[7] hidden w-[210px] overflow-hidden rounded-[10px] border border-grid bg-panel transition-opacity duration-200 lg:block ${
          preview ? "opacity-100" : "opacity-0"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="aspect-[16/10] w-full object-cover" />
        ) : null}
      </div>
    </div>
  );
}
