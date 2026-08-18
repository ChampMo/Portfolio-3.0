"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createDisplaceFade, type DisplaceFade } from "@/lib/site/displaceFade";

const INTERVAL_MS = 5000;
/* Shorter than the old wave: a mechanical flip that lingers stops reading as
   mechanical. */
const FLIP_MS = 780;

/**
 * Viewfinder-framed slideshow for the About section.
 *
 * Auto-advance stops permanently once the visitor takes control, pauses on
 * hover, and never starts under prefers-reduced-motion — a looping image swap
 * is exactly the unrequested movement that setting asks to suppress.
 */
export default function Slideshow({
  images,
  alt,
  /** Frame shape. Defaults to landscape; About passes a portrait/fill variant. */
  frameClassName = "aspect-[3/2]",
}: {
  images: string[];
  alt: string;
  frameClassName?: string;
}) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const count = list.length;

  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  /** WebGL layer. Null until it succeeds; the <img> stack covers until then. */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fadeRef = useRef<DisplaceFade | null>(null);
  const prevIndex = useRef(0);
  const [gl, setGl] = useState(false);

  // Plain function, not a useCallback: it is only ever read by event handlers,
  // and the React Compiler cannot preserve a manual memo whose inferred deps
  // disagree with the written ones.
  function go(delta: number) {
    setAuto(false);
    setIndex((i) => (i + delta + count) % count);
  }

  const running = auto && !hover && count > 1;

  useEffect(() => {
    if (!running) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = performance.now();
    let raf = 0;

    // The progress bar is driven straight through a ref so the countdown does
    // not re-render the slideshow on every frame.
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / INTERVAL_MS);
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (p >= 1) setIndex((i) => (i + 1) % count);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [running, count, index]);

  // ── WebGL displacement layer ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;

    (async () => {
      // The cell flash uses the theme's own accent, read from the cascade so
      // it stays right if the palette is ever retuned.
      const signal =
        getComputedStyle(document.documentElement).getPropertyValue("--signal") ||
        "#ff8a34";
      const fade = await createDisplaceFade(canvas, list, signal);
      // Every failure path inside the factory returns null: no context, a
      // texture the host would not serve with CORS, a shader that would not
      // compile. In all of them the plain cross-fade below stays on screen.
      if (!fade) return;
      if (cancelled) {
        fade.dispose();
        return;
      }
      fadeRef.current = fade;
      fade.show(prevIndex.current);
      setGl(true);
    })();

    const onResize = () => fadeRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      fadeRef.current?.dispose();
      fadeRef.current = null;
      setGl(false);
    };
    // `list` is rebuilt each render from the same prop, so the join keeps this
    // keyed to the actual set of images.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.join("|"), count]);

  useEffect(() => {
    const from = prevIndex.current;
    prevIndex.current = index;
    if (from === index) return;
    fadeRef.current?.transition(from, index, FLIP_MS);
  }, [index]);

  if (count === 0) return null;

  return (
    <figure
      className="group relative m-0 flex h-full flex-col"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(-1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(1);
        }
      }}
      tabIndex={count > 1 ? 0 : -1}
      data-cursor="DRAG"
      data-cursor-mode="pan"
      aria-roledescription="carousel"
      aria-label={alt}
    >
      <div
        className={`relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-grid bg-panel ${frameClassName}`}
      >
        {/* The canvas paints the same frames once WebGL is up; the images stay
            mounted underneath so the alt text and the no-WebGL path survive. */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 size-full transition-opacity duration-300 ${
            gl ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        {list.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt={i === index ? alt : ""}
            aria-hidden={i === index ? undefined : true}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
              i === index && !gl ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* viewfinder chrome */}
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 border-l border-t border-ink/40" />
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-4 border-r border-t border-ink/40" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 size-4 border-b border-l border-ink/40" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 size-4 border-b border-r border-ink/40" />

        <span className="pointer-events-none absolute left-5 top-5 rounded bg-ground/75 px-2 py-0.5 font-mono text-[10px] tabular-nums tracking-[0.14em] text-ink-muted backdrop-blur-sm">
          FRAME {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>

        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(-1)}
              className="absolute left-4 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-grid bg-ground/80 text-ink-muted opacity-0 backdrop-blur-sm transition-all hover:border-signal hover:text-signal focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(1)}
              className="absolute right-4 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-grid bg-ground/80 text-ink-muted opacity-0 backdrop-blur-sm transition-all hover:border-signal hover:text-signal focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </>
        ) : null}

        {/* auto-advance countdown */}
        {running ? (
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-grid/50">
            <div ref={barRef} className="h-full origin-left scale-x-0 bg-signal" />
          </div>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="mt-3 flex gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => {
                setAuto(false);
                setIndex(i);
              }}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === index ? "bg-signal" : "bg-grid hover:bg-ink-muted"
              }`}
            />
          ))}
        </div>
      ) : null}
    </figure>
  );
}
