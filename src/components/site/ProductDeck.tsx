"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Play,
  X,
} from "lucide-react";
import type { ProductDoc } from "@/models/Product";
import type { Release, ReleaseAsset } from "@/lib/github/release";
import { fileSize, PLATFORM_LABEL } from "@/lib/github/release";
import type { ProductPlatform } from "@/lib/content/constants";
import { safeHref, youtubeId, youtubeEmbed } from "@/lib/content/url";
import Lightbox from "./Lightbox";
import { lockScroll } from "@/lib/site/scrollLock";
import ProductBackdrop from "./ProductBackdrop";
import { extractTheme } from "@/lib/content/backdrop";
import { useResolvedTheme } from "@/lib/site/useResolvedTheme";

export type DeckUnit = {
  product: ProductDoc;
  release: Release | null;
  /** Slug of the linked case study, resolved server-side. */
  projectSlug: string | null;
};

const STATUS_TONE: Record<string, string> = {
  LIVE: "text-telemetry border-telemetry/45",
  BETA: "text-signal border-signal/45",
  IN_DEVELOPMENT: "text-ink-muted border-grid",
};

/* Read through an external store rather than an effect: `navigator` does not
   exist on the server, and setting state from an effect is the cascading-render
   pattern the hooks lint rejects. Serialised so snapshots compare by value. */
const subscribePlatform = () => () => {};
const platformSnapshot = () => {
  const { platform, arm } = detectPlatform();
  return `${platform}|${arm ? 1 : 0}`;
};

/** Best guess at the visitor's platform, for picking a default download. */
function detectPlatform(): { platform: ProductPlatform; arm: boolean } {
  if (typeof navigator === "undefined") return { platform: "WINDOWS", arm: false };
  const ua = navigator.userAgent;
  const arm = /arm|aarch64/i.test(ua);

  if (/android/i.test(ua)) return { platform: "ANDROID", arm };
  if (/iphone|ipad|ipod/i.test(ua)) return { platform: "IOS", arm: true };
  if (/mac os x|macintosh/i.test(ua)) {
    // Apple Silicon Macs still report Intel in the UA string. Every Mac with
    // more than one GPU-backed touch point is an M-series; it is the standard
    // workaround, and guessing wrong only costs one extra click.
    return { platform: "MACOS", arm: navigator.maxTouchPoints > 1 || arm };
  }
  if (/linux/i.test(ua)) return { platform: "LINUX", arm };
  return { platform: "WINDOWS", arm };
}

/**
 * Mirrors the visible unit into the address bar so the deck can be linked to
 * mid-way.
 *
 * `replaceState`, never `location.hash = …`: assigning the hash pushes a
 * history entry per panel, which would bury the page the visitor came from
 * under one step for every unit they scrolled past. It also has to carry the
 * existing state forward — that is where the back trail lives.
 */
function writeHash(slug?: string) {
  if (!slug) return;
  try {
    window.history.replaceState(window.history.state, "", `#${slug}`);
  } catch {
    /* the deck still works without a shareable hash */
  }
}

/** Assets for a product: from the release when there is one, else manual rows. */
function assetsFor(unit: DeckUnit): ReleaseAsset[] {
  if (unit.release?.assets.length) return unit.release.assets;
  return unit.product.downloads.map((d) => ({
    name: d.label || d.url.split("/").pop() || "download",
    url: d.url,
    size: 0,
    downloads: 0,
    platform: d.platform,
    arch: d.arch,
    kind: "installer" as const,
  }));
}

/**
 * The product deck.
 *
 * One product fills the viewport and you travel sideways between them — the
 * same axis the entrance slid along, so the transition and the page turn out
 * to be one idea rather than an effect bolted onto a list. The site's whole
 * story runs vertically; its software runs across.
 *
 * Below the `md` breakpoint this becomes an ordinary vertical stack. Horizontal
 * scrolling on a phone fights the gesture the platform already owns, and no
 * amount of polish wins that fight.
 */
export default function ProductDeck({ units }: { units: DeckUnit[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  /** Mirrors `index` for the scroll handlers, which must not close over state. */
  const indexRef = useRef(0);

  /**
   * The slug list as one string. The effect below needs the slugs but must not
   * depend on the `units` array itself: that identity changes on every render,
   * which would tear down the listeners and re-run the deep-link jump each
   * time — yanking the deck back to the linked panel while the visitor is
   * scrolling away from it.
   */
  const slugKey = units.map((u) => u.product.slug ?? "").join("|");

  /** Blocks wheel events while a panel-to-panel journey is still running. */
  const wheelLock = useRef(0);

  // Wheel and keyboard drive the horizontal travel on desktop.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;

    const slugs = slugKey.split("|");

    /**
     * Wheel travel moves whole panels, never raw pixels.
     *
     * The track is `scroll-snap-type: x mandatory`, and mandatory means the
     * browser refuses to *rest* anywhere except on a snap point. Adding a
     * wheel delta to `scrollLeft` asks it to rest about 120px in — between
     * two snap points a panel-width apart — so the snap immediately pulled it
     * back to the panel it started on. Every notch was undone as fast as it
     * was applied, which is why the deck sat still while the arrow keys, which
     * jump a whole panel, worked the entire time.
     *
     * So the wheel does what the keys do: pick the next index and let the
     * scroller travel there. `go` lands exactly on a snap point, so the snap
     * agrees with it instead of fighting it.
     */
    const onWheel = (e: WheelEvent) => {
      // Whether there is anywhere to travel is a question about the content,
      // and the content is known. Asking the layout instead meant one CSS
      // detail anywhere in the chain — a width that resolved to zero, an
      // overflow that landed on the wrong axis — silently turned the whole
      // gesture off, with the handler still running and finding nothing to do.
      if (slugs.length < 2) return;

      // A trackpad sends both axes; take whichever the visitor meant.
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 2) return;

      const dir = delta > 0 ? 1 : -1;
      const next = indexRef.current + dir;

      // Past either end the wheel belongs to the page again, so a panel taller
      // than the viewport can still be read and nobody is trapped in the deck.
      if (next < 0 || next > slugs.length - 1) return;

      e.preventDefault();

      // One flick is dozens of events and one notch is often several. Without
      // this the first of them would be spent travelling and the rest would
      // arrive mid-journey, skipping panels the visitor never saw.
      const now = performance.now();
      if (now < wheelLock.current) return;
      wheelLock.current = now + 620;

      go(dir);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && /INPUT|TEXTAREA/.test(target.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };

    /** Single place the current unit is recorded, whatever moved the deck. */
    function setUnit(i: number) {
      if (i === indexRef.current) return;
      indexRef.current = i;
      setIndex(i);
      writeHash(slugs[i]);
    }

    /**
     * Travels one step and records the arrival immediately.
     *
     * The index used to be derived purely from the scroll event, which made
     * every deliberate move depend on the browser reporting the scroll it was
     * just asked to perform. Scroll events are coalesced under load and are
     * not guaranteed at all for a programmatic jump, and a dropped one leaves
     * the deck showing one panel while the rail, the hash and the *next*
     * keypress all still believe it is on the previous one — each subsequent
     * step then computed from a stale position.
     *
     * `go` knows exactly where it is sending the deck, so it says so. The
     * scroll listener still runs, for the moves `go` did not make: a swipe, a
     * drag of the scrollbar, a snap settling somewhere new.
     */
    function go(delta: number) {
      const next = Math.min(slugs.length - 1, Math.max(0, indexRef.current + delta));
      travelTo(track!, next * track!.clientWidth);
      setUnit(next);
    }

    const onScroll = () => {
      setUnit(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
    };

    track.addEventListener("wheel", onWheel, { passive: false });
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);

    // Arriving at /products#orbitkey opens on that unit rather than on the
    // first one. Jumped without smooth scrolling on purpose: the bulkhead is
    // still covering the screen at this point, and a visible slide from unit
    // 01 would contradict the link the visitor just followed. State is left to
    // the scroll event this fires.
    const wanted = decodeURIComponent(window.location.hash.slice(1));
    if (wanted) {
      const i = slugs.indexOf(wanted);
      if (i > 0) track.scrollLeft = i * track.clientWidth;
    }

    return () => {
      track.removeEventListener("wheel", onWheel);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [slugKey]);

  function jump(i: number) {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      travelTo(track, i * track.clientWidth);
    } else {
      track.children[i]?.scrollIntoView({ behavior: "smooth" });
    }
    writeHash(units[i]?.product.slug);
  }

  if (units.length === 0) {
    return (
      <div className="grid min-h-[60svh] place-items-center px-[var(--pad-x)] text-center">
        <div>
          <p className="mb-3 font-display text-[clamp(2rem,5vw,3.4rem)] uppercase leading-none text-ink-muted/70">
            Bay empty
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            Nothing deployed yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={trackRef}
        // `overflow-y-hidden` is not decoration. Setting `overflow-x` to
        // anything but `visible` forces the other axis to compute to `auto`
        // as well, so this quietly became a two-axis scroller: a panel taller
        // than the space left under the header scrolled *inside* the track,
        // and the wheel spent itself there instead of travelling sideways.
        // Pinned to one axis, the panels manage their own height.
        className="deck-track flex-1 md:flex md:snap-x md:snap-mandatory md:overflow-x-auto md:overflow-y-hidden"
      >
        {units.map((unit, i) => (
          <Panel key={unit.product._id} unit={unit} n={i + 1} total={units.length} />
        ))}
      </div>

      {/* Travel rail — only when there is somewhere to travel. */}
      <div
        className={`shrink-0 items-center gap-5 border-t border-grid px-[var(--pad-x)] py-3.5 ${
          units.length > 1 ? "hidden md:flex" : "hidden"
        }`}
      >
        {units.map((u, i) => (
          <button
            key={u.product._id}
            type="button"
            onClick={() => jump(i)}
            aria-current={i === index}
            className={`font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
              i === index ? "text-signal" : "text-ink-muted/45 hover:text-ink-muted"
            }`}
          >
            {String(i + 1).padStart(2, "0")} {u.product.name}
          </button>
        ))}
        <span aria-hidden="true" className="h-px flex-1 bg-grid" />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted/60">
          Scroll or ← → to travel
        </span>
      </div>
    </div>
  );
}

function Panel({ unit, n, total }: { unit: DeckUnit; n: number; total: number }) {
  const { product, release, projectSlug } = unit;
  const assets = assetsFor(unit);
  const version = release?.version || product.version;
  const live = safeHref(product.liveUrl);

  /**
   * A backdrop document can also carry the palette for the panel in front of
   * it, so one file defines a product's whole look. Applied as custom
   * properties on this section only — everything inside already reads its
   * colours from them, so nothing else has to know this happened.
   */
  const mode = useResolvedTheme();
  const theme = useMemo(() => extractTheme(product.backdropHtml), [product.backdropHtml]);
  const vars = theme[mode];

  return (
    <section
      id={product.slug || undefined}
      style={vars as React.CSSProperties}
      // `min-w-full` as well as `w-full`: a flex item resolves its main size
      // through `flex-basis: auto` -> `width`, and a percentage width against
      // a scrolling container is exactly where that resolution gets fragile.
      // A minimum cannot be negotiated away, so the track always overflows by
      // one viewport per extra unit — which is the whole travel.
      className="relative w-full shrink-0 overflow-hidden bg-ground md:min-w-full md:snap-start md:overflow-y-auto"
    >
      <ProductBackdrop html={product.backdropHtml} opacity={product.backdropOpacity} />

      <div className="relative z-[1] mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-x-14 gap-y-10 px-[var(--pad-x)] py-14 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
        {/* ── pitch ── */}
        <div className="min-w-0">
          <p className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            <span>
              Unit <span className="text-signal">{String(n).padStart(2, "0")}</span> /{" "}
              {String(total).padStart(2, "0")}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 ${
                STATUS_TONE[product.status] ?? STATUS_TONE.IN_DEVELOPMENT
              }`}
            >
              {product.status.replace("_", " ")}
            </span>
          </p>

          <div className="mb-3 flex items-center gap-4">
            {product.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.icon}
                alt=""
                className="size-14 shrink-0 rounded-[12px] border border-grid object-cover"
              />
            ) : null}
            <h2 className="min-w-0 break-words font-display text-[clamp(2.6rem,6vw,4.4rem)] uppercase leading-[0.9]">
              {product.name}
            </h2>
          </div>

          {product.tagline ? (
            <p className="mb-5 font-mono text-[13px] tracking-[0.02em] text-signal">
              {product.tagline}
            </p>
          ) : null}

          {product.description ? (
            <p className="mb-7 max-w-[52ch] whitespace-pre-line text-[15px] leading-[1.75] text-ink-muted">
              {product.description}
            </p>
          ) : null}

          <div className="mb-7 flex flex-wrap gap-2">
            {product.platforms.map((p) => (
              <span
                key={p}
                className="rounded-full border border-grid px-3 py-[5px] font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted"
              >
                {PLATFORM_LABEL[p] ?? p}
              </span>
            ))}
            {version ? (
              <span className="rounded-full border border-grid px-3 py-[5px] font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted">
                v{version}
              </span>
            ) : null}
          </div>

          <Actions live={live} assets={assets} notes={product.installNotes} />

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-grid pt-5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
            {release && release.totalDownloads > 0 ? (
              <span>
                <span className="text-telemetry tabular-nums">
                  {release.totalDownloads.toLocaleString()}
                </span>{" "}
                downloads
              </span>
            ) : null}
            {release?.publishedAt ? (
              <span>
                Released{" "}
                <span className="tabular-nums">
                  {new Date(release.publishedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </span>
            ) : null}
            {projectSlug ? (
              <Link
                href={`/work/${projectSlug}`}
                data-cursor="VIEW"
                className="inline-flex items-center gap-1.5 text-telemetry transition-colors hover:text-signal"
              >
                Read the case study
                <ArrowRight size={11} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>

        {/* ── device ── */}
        <DeviceFrame product={product} />
      </div>
    </section>
  );
}

/** Primary download for this visitor's platform, with the rest behind a toggle. */
function Actions({
  live,
  assets,
  notes,
}: {
  live?: string;
  assets: ReleaseAsset[];
  notes: string;
}) {
  const [all, setAll] = useState(false);
  const snapshot = useSyncExternalStore(subscribePlatform, platformSnapshot, () => "");
  const me = snapshot
    ? {
        platform: snapshot.split("|")[0] as ProductPlatform,
        arm: snapshot.endsWith("|1"),
      }
    : null;

  // Rank: right platform first, then right architecture, then installers over
  // archives. Eight assets in a table is a decision the visitor should not have
  // to make; one obvious button and an escape hatch is.
  const best = me
    ? [...assets].sort((a, b) => score(b, me) - score(a, me))[0]
    : undefined;
  const rest = best ? assets.filter((a) => a !== best) : assets;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {live ? (
          <a
            href={live}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="OPEN"
            className="inline-flex items-center gap-2.5 rounded-full border border-signal bg-signal px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-on-signal transition-opacity hover:opacity-85"
          >
            Open app
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : null}

        {best ? (
          <a
            href={best.url}
            data-cursor="GET"
            className={`inline-flex items-center gap-2.5 rounded-full px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-all ${
              live
                ? "border border-grid text-ink-muted hover:border-signal hover:text-signal"
                : "border border-signal bg-signal text-on-signal hover:opacity-85"
            }`}
          >
            <Download size={13} aria-hidden="true" />
            Download for {PLATFORM_LABEL[best.platform]}
            {best.arch ? ` (${best.arch})` : ""}
            {best.size ? (
              <span className="opacity-70">&middot; {fileSize(best.size)}</span>
            ) : null}
          </a>
        ) : null}
      </div>

      {rest.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-signal"
          >
            <ChevronDown
              size={11}
              aria-hidden="true"
              className={`transition-transform ${all ? "rotate-180" : ""}`}
            />
            {all ? "Hide" : `All builds (${rest.length})`}
          </button>

          {all ? (
            <ul className="mt-3 flex list-none flex-col gap-1 border-t border-grid p-0 pt-3">
              {rest.map((a) => (
                <li key={a.url}>
                  <a
                    href={a.url}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 font-mono text-[10.5px] text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink"
                  >
                    <Download size={11} aria-hidden="true" className="shrink-0 opacity-50" />
                    <span className="w-[4.5rem] shrink-0 uppercase tracking-[0.1em] text-telemetry">
                      {PLATFORM_LABEL[a.platform]}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    {a.size ? (
                      <span className="shrink-0 tabular-nums opacity-60">
                        {fileSize(a.size)}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {notes ? (
        <p className="max-w-[50ch] whitespace-pre-line border-l-2 border-warn/50 pl-3 text-[12px] leading-relaxed text-ink-muted">
          {notes}
        </p>
      ) : null}
    </div>
  );
}

function score(a: ReleaseAsset, me: { platform: ProductPlatform; arm: boolean }): number {
  let s = 0;
  if (a.platform === me.platform) s += 100;
  const isArm = /arm|silicon|aarch/i.test(a.arch);
  if (isArm === me.arm) s += 20;
  if (a.kind === "installer") s += 10;
  return s;
}

/**
 * Smooth-scrolls the deck to a panel offset.
 *
 * `scrollTo({ behavior: "smooth" })` on its own does nothing here. The track
 * is `scroll-snap-type: x mandatory`, and the browser re-applies that snap on
 * every frame of the animation — each step is dragged back to the panel the
 * scroll started from, so the whole journey resolves exactly where it began.
 * Instant scrolls survive it (they land on a snap point in one go) which is
 * why the deep-link jump has always worked while every animated move did not.
 *
 * Suspending the snap for the duration lets the animation actually travel;
 * restoring it once the scroll settles keeps the resting rule intact, so a
 * panel is still never left half shown.
 */
function travelTo(track: HTMLElement, left: number) {
  const from = track.scrollLeft;
  if (Math.abs(from - left) < 1) return;

  track.style.scrollSnapType = "none";
  track.scrollTo({ left, behavior: "smooth" });

  let timer = 0;
  const restore = () => {
    track.style.scrollSnapType = "";
    track.removeEventListener("scrollend", restore);
    window.clearTimeout(timer);
  };

  /**
   * Arriving is not optional; the animation is.
   *
   * A smooth scroll that is refused leaves no error and no event — the
   * scroller simply stays put, and the panel the visitor asked for never
   * comes. By 120ms a real animation has always moved by some amount, so
   * having moved by nothing means it is never going to: land the panel
   * outright rather than swallow the gesture.
   */
  window.setTimeout(() => {
    if (track.scrollLeft === from) {
      track.scrollTo({ left, behavior: "auto" });
      restore();
    }
  }, 120);

  // `scrollend` is the exact signal. The timeout covers browsers that lack it
  // and the case where the scroll never starts because it was already there.
  timer = window.setTimeout(restore, 700);
  track.addEventListener("scrollend", restore);
}

/**
 * The demo clip at full size.
 *
 * The frame's copy is deliberately inert — muted, unpausable, chrome
 * suppressed — which is right for something playing in the corner of a pitch
 * and wrong for someone who has decided to watch it. This one is the opposite
 * on every count: real controls, sound available, and as much of the viewport
 * as the aspect ratio allows.
 *
 * Portalled to the body for the same reason the image viewer is — inside the
 * deck's horizontal scroller, a wheel over the overlay travelled the deck.
 */
function ClipOverlay({
  title,
  youtube,
  file,
  onClose,
}: {
  title: string;
  youtube: string;
  file: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Swallowed rather than acted on: nothing here scrolls, and letting it
    // through would move the deck behind the overlay.
    const onWheel = (e: WheelEvent) => e.preventDefault();

    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    const unlock = lockScroll();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      unlock();
    };
  }, [onClose]);

  // No mount flag: both overlays are opened by a click, so they never exist
  // during the server render and there is no hydration pass to disagree with.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — demo`}
      className="lightbox fixed inset-0 z-[110] flex flex-col bg-ground/95 backdrop-blur-[6px]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-grid px-5 py-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {title} <span className="text-signal">demo</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-cursor="CLOSE"
          className="grid size-9 place-items-center rounded-full border border-grid text-ink-muted transition-colors hover:border-signal hover:text-signal"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />
        <div className="lightbox-img relative aspect-video max-h-full w-full max-w-[1200px] overflow-hidden rounded-card border border-grid bg-panel-2">
          {youtube ? (
            <iframe
              // Controls and sound this time: the visitor asked for the video.
              src={`https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={`${title} — demo`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full border-0"
            />
          ) : (
            <video src={file} autoPlay loop controls playsInline className="size-full" />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * One entry in a product's gallery: the demo clip and every screenshot, in a
 * single ordered list.
 */
type Media =
  | { kind: "youtube"; id: string }
  | { kind: "video"; src: string }
  | { kind: "image"; src: string };

/**
 * Screen in a frame, with the product's media on a strip beneath it.
 *
 * The clip and the screenshots used to be two separate mechanisms — one owned
 * the frame, the others hid behind a button — so the answer to "show me the
 * next thing" depended on which kind of thing was already showing. They are
 * one list here: the stage shows whichever item is selected, the strip shows
 * all of them, and the clip is simply the first. Neither has to be dismissed
 * to reach the other, and a screenshot is selected exactly the way the video
 * is.
 */
function DeviceFrame({ product }: { product: ProductDoc }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);
  const [sel, setSel] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [clip, setClip] = useState(false);
  const phone = product.deviceType === "PHONE";
  const embed = product.embedLive ? safeHref(product.liveUrl) : undefined;

  const shots = product.screenshots;
  const tube = youtubeId(product.demoVideo);
  const file = tube ? "" : safeHref(product.demoVideo) || "";

  // The clip leads: it is the one item that shows the product in motion.
  const media = useMemo<Media[]>(() => {
    const out: Media[] = [];
    if (tube) out.push({ kind: "youtube", id: tube });
    else if (file) out.push({ kind: "video", src: file });
    for (const src of shots) out.push({ kind: "image", src });
    return out;
  }, [tube, file, shots]);

  const current = media[Math.min(sel, media.length - 1)];
  /** Where the shown item sits among the images alone, for the viewer. */
  const imageIndex = Math.max(
    0,
    shots.indexOf(current && current.kind === "image" ? current.src : "")
  );

  // The screen powers on when the panel is actually looked at — and the iframe
  // only mounts then, so three products do not load three apps at once.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setOn(true);
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /**
   * Moves the selection and brings the newly chosen tile into view.
   *
   * The arrows step through the media rather than scrolling the strip: what is
   * being chosen is what the stage shows, and a control that only slid the
   * thumbnails along would leave the stage behind while looking like it had
   * done something to it.
   */
  function step(delta: number) {
    const next = Math.min(media.length - 1, Math.max(0, sel + delta));
    setSel(next);
    stripRef.current?.children[next]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }

  return (
    <div ref={ref} className={phone ? "mx-auto w-[min(300px,80%)]" : "w-full min-w-0"}>
      <div
        className={`device relative rounded-[20px] border-2 border-grid bg-panel p-2 ${
          on ? "is-on" : ""
        }`}
      >
        <div
          className={`relative overflow-hidden rounded-[13px] bg-panel-2 ${
            phone ? "aspect-[9/19.5]" : "aspect-[16/10]"
          }`}
        >
          {embed && on ? (
            <iframe
              src={embed}
              title={`${product.name} — live`}
              loading="lazy"
              // The embedded app is the author's own, but it is still a
              // separate origin: sandbox it rather than hand it this page.
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="size-full border-0"
            />
          ) : current && current.kind === "youtube" ? (
            // Inert on purpose. A player that cannot be paused keeps its own
            // title bar, channel line and buttons faded out, which is the only
            // reliable way to stop YouTube painting its furniture across the
            // product. The click it no longer receives is taken by the button
            // sitting on top of it.
            <>
              <iframe
                src={youtubeEmbed(current.id)}
                title={`${product.name} — demo`}
                loading="lazy"
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                tabIndex={-1}
                aria-hidden="true"
                className="pointer-events-none size-full border-0"
              />
              <button
                type="button"
                onClick={() => setClip(true)}
                data-cursor="PLAY"
                aria-label={`Play the ${product.name} demo full size`}
                className="absolute inset-0"
              />
            </>
          ) : current && current.kind === "video" ? (
            <>
              <video
                src={current.src}
                autoPlay
                muted
                loop
                playsInline
                className="pointer-events-none size-full object-contain"
              />
              <button
                type="button"
                onClick={() => setClip(true)}
                data-cursor="PLAY"
                aria-label={`Play the ${product.name} demo full size`}
                className="absolute inset-0"
              />
            </>
          ) : current && current.kind === "image" ? (
            // `object-contain` rather than `cover`: a screenshot cropped to the
            // frame's aspect ratio loses whichever edge of the interface did
            // not fit, which is the part a screenshot is being shown for.
            <button
              type="button"
              onClick={() => setZoom(true)}
              data-cursor="ZOOM"
              aria-label={`Open screenshot ${imageIndex + 1} full size`}
              className="size-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.src}
                alt={`${product.name} screenshot ${imageIndex + 1}`}
                className="size-full object-contain"
              />
            </button>
          ) : (
            <div className="grid size-full place-items-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted/60">
              No signal
            </div>
          )}

          <span aria-hidden="true" className="screen-scan" />
        </div>
      </div>

      {media.length > 1 && !embed ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={sel === 0}
            aria-label="Previous"
            className="grid size-7 shrink-0 place-items-center rounded border border-grid text-ink-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-25 disabled:hover:border-grid disabled:hover:text-ink-muted"
          >
            <ChevronLeft size={13} aria-hidden="true" />
          </button>

          <div
            ref={stripRef}
            className="deck-strip flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth pb-1"
          >
            {media.map((m, i) => {
              const active = i === sel;
              return (
                <button
                  key={m.kind === "youtube" ? `yt-${m.id}` : `${m.kind}-${m.src}-${i}`}
                  type="button"
                  onClick={() => setSel(i)}
                  aria-current={active}
                  data-cursor="VIEW"
                  aria-label={
                    m.kind === "image"
                      ? `Screenshot ${shots.indexOf(m.src) + 1}`
                      : "Demo clip"
                  }
                  className={`relative h-12 w-[74px] shrink-0 overflow-hidden rounded border transition-all ${
                    active
                      ? "border-signal opacity-100"
                      : "border-grid opacity-55 hover:opacity-100"
                  }`}
                >
                  {m.kind === "youtube" ? (
                    // YouTube's own still, so the tile shows the clip itself
                    // rather than a placeholder standing in for it.
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`https://i.ytimg.com/vi/${m.id}/mqdefault.jpg`}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : m.kind === "video" ? (
                    <video
                      src={m.src}
                      muted
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.src} alt="" loading="lazy" className="size-full object-cover" />
                  )}

                  {m.kind !== "image" ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 grid place-items-center bg-ground/35"
                    >
                      <span className="grid size-5 place-items-center rounded-full bg-ground/80 text-signal">
                        <Play size={9} fill="currentColor" />
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => step(1)}
            disabled={sel >= media.length - 1}
            aria-label="Next"
            className="grid size-7 shrink-0 place-items-center rounded border border-grid text-ink-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-25 disabled:hover:border-grid disabled:hover:text-ink-muted"
          >
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {clip && (tube || file) ? (
        <ClipOverlay
          title={product.name}
          youtube={tube}
          file={file}
          onClose={() => setClip(false)}
        />
      ) : null}

      {zoom ? (
        <Lightbox
          images={shots}
          index={imageIndex}
          title={product.name}
          onIndex={(i) => {
            // The viewer and the strip are two views of one selection, so a
            // move in either has to show up in the other.
            const src = shots[i];
            const at = media.findIndex((m) => m.kind === "image" && m.src === src);
            if (at >= 0) setSel(at);
          }}
          onClose={() => setZoom(false)}
        />
      ) : null}
    </div>
  );
}
