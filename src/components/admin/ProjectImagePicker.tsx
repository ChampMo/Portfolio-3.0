"use client";

import { useState } from "react";
import { Check, ImageDown, Star } from "lucide-react";
import type { LinkableProject } from "./ProjectLinker";

/** Thumbnails shown before the strip offers to expand. */
const PREVIEW = 12;

/**
 * Reuses the linked project's images as the product's icon and screenshots.
 *
 * A product and its case study are two records describing one thing, and the
 * pictures were already uploaded once for the write-up. Without this the only
 * way to show them here was to upload the same files a second time, leaving
 * two copies in the asset host that drift apart the moment one is replaced.
 *
 * Nothing is copied — both records store the same URL.
 */
export default function ProjectImagePicker({
  project,
  icon,
  screenshots,
  onIcon,
  onScreenshots,
}: {
  project: LinkableProject | null;
  icon: string;
  screenshots: string[];
  onIcon: (v: string) => void;
  onScreenshots: (v: string[]) => void;
}) {
  const [all, setAll] = useState(false);
  const images = project?.images ?? [];

  if (!project || images.length === 0) return null;

  const shots = Array.isArray(screenshots) ? screenshots : [];
  const shown = all ? images : images.slice(0, PREVIEW);

  function toggleShot(src: string) {
    onScreenshots(shots.includes(src) ? shots.filter((s) => s !== src) : [...shots, src]);
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-grid bg-ground p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          From {project.name}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-ink-muted">
          {shots.filter((s) => images.includes(s)).length} / {images.length} used
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-muted">
        Click a picture to use it as a screenshot; the star sets it as the icon.
        These are the project&rsquo;s own cover and gallery images, so nothing is
        uploaded twice.
      </p>

      <div className="flex max-h-[260px] flex-wrap gap-2.5 overflow-y-auto">
        {shown.map((src) => {
          const picked = shots.includes(src);
          const isIcon = icon === src;
          return (
            <div key={src} className="relative">
              <button
                type="button"
                onClick={() => toggleShot(src)}
                aria-pressed={picked}
                title={picked ? "Remove from screenshots" : "Add to screenshots"}
                className={`group block size-20 overflow-hidden rounded border transition-colors ${
                  picked ? "border-signal" : "border-grid hover:border-ink-muted"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className={`size-full object-cover transition-opacity ${
                    picked ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                  }`}
                />
              </button>

              {picked ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1 top-1 grid size-4 place-items-center rounded-full bg-signal text-on-signal"
                >
                  <Check size={10} />
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => onIcon(isIcon ? "" : src)}
                aria-pressed={isIcon}
                title={isIcon ? "Clear the icon" : "Use as icon"}
                className={`absolute bottom-1 right-1 grid size-5 place-items-center rounded-full border transition-colors ${
                  isIcon
                    ? "border-signal bg-signal text-on-signal"
                    : "border-grid bg-ground/85 text-ink-muted hover:border-signal hover:text-signal"
                }`}
              >
                <Star size={10} fill={isIcon ? "currentColor" : "none"} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {images.length > PREVIEW ? (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="rounded-full border border-grid px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
          >
            {all ? "Show fewer" : `Show all ${images.length}`}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            // Appends rather than replaces: screenshots uploaded here directly
            // should not be wiped by pulling the project's set in.
            const merged = [...shots];
            for (const src of images) if (!merged.includes(src)) merged.push(src);
            onScreenshots(merged);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-grid px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
        >
          <ImageDown size={11} aria-hidden="true" />
          Add all
        </button>

        {shots.some((s) => images.includes(s)) ? (
          <button
            type="button"
            onClick={() => onScreenshots(shots.filter((s) => !images.includes(s)))}
            className="rounded-full border border-grid px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:border-danger hover:text-danger"
          >
            Remove all
          </button>
        ) : null}
      </div>
    </div>
  );
}
