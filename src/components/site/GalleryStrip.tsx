"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import Lightbox from "./Lightbox";

/**
 * A gallery block plus its lightbox.
 *
 * The strip alone was a dead end: these are screenshots of interfaces, and at
 * row height the text inside them is unreadable, which is most of what a
 * screenshot is for. Opening one full-size is the point of including it.
 */
export default function GalleryStrip({
  title,
  images,
  height,
}: {
  title: string;
  images: string[];
  height: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const count = images.length;

  if (count === 0) return null;

  return (
    <figure className="m-0" data-reveal>
      {title ? (
        <figcaption className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {title}
        </figcaption>
      ) : null}

      {/* Horizontal scroll rather than wrapping: keeps the author's chosen row
          height meaningful regardless of image count. */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            data-cursor="ZOOM"
            aria-label={`Open image ${i + 1} of ${count}`}
            style={{ height: `${height}px` }}
            className="group relative w-auto shrink-0 overflow-hidden rounded-card border border-grid transition-colors hover:border-signal"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={title ? `${title} — ${i + 1}` : `Image ${i + 1}`}
              style={{ height: `${height}px` }}
              className="w-auto object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-grid bg-ground/85 text-ink-muted opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <Maximize2 size={12} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>

      {open !== null ? (
        <Lightbox
          images={images}
          index={open}
          title={title}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </figure>
  );
}
