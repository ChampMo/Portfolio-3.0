"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, Eye, EyeOff } from "lucide-react";
import { backdropDocument, readPaletteVars, extractTheme } from "@/lib/content/backdrop";
import { useResolvedTheme } from "@/lib/site/useResolvedTheme";

const SAMPLE = `<style>
  .field {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      60% 60% at 70% 30%,
      color-mix(in srgb, var(--signal) 22%, transparent),
      transparent 70%
    );
  }
  .field::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, var(--grid) 1px, transparent 1px),
      linear-gradient(to bottom, var(--grid) 1px, transparent 1px);
    background-size: 90px 90px;
    opacity: .5;
    animation: drift 18s linear infinite;
  }
  @keyframes drift { to { background-position: 90px 90px; } }
</style>
<div class="field"></div>`;

/**
 * Editor for a product's backdrop document.
 *
 * A textarea rather than a server-side file upload: these are short snippets
 * that want tweaking in place, and round-tripping them through an upload host
 * would mean re-uploading the file to change one colour. Dropping an `.html`
 * file still works — it is read in the browser and its text lands in the box,
 * so there is nothing stored twice and nothing to keep in sync.
 */
/**
 * Splits a `--token:value;` string into the object React wants.
 *
 * The same string is handed to the frame as raw CSS text, so keeping one
 * source and converting here avoids the two drifting apart.
 */
function parseVars(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const key = decl.slice(0, i).trim();
    if (key.startsWith("--")) out[key] = decl.slice(i + 1).trim();
  }
  return out;
}

export default function BackdropEditor({
  value,
  opacity,
  onChange,
  onOpacity,
}: {
  value: string;
  opacity: number;
  onChange: (v: string) => void;
  onOpacity: (v: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState(false);
  /** Captured when the preview opens, so it matches the admin's current theme. */
  const [vars, setVars] = useState("");
  const mode = useResolvedTheme();

  /**
   * The palette this backdrop will actually run under.
   *
   * A backdrop may carry its own `signal-theme` block, and on the public deck
   * that palette replaces the site's for the whole panel — the ground it sits
   * on included. The preview was showing it under the *admin's* colours
   * instead, so a document written for a near-black panel was being judged on
   * cream: every `color-mix` against `--ink` resolved to the opposite end of
   * the scale, and the one question the preview exists to answer — does this
   * look right — was being answered about a page that will never exist.
   */
  const theme = useMemo(() => extractTheme(value), [value]);
  const panelVars = useMemo(() => {
    const own = Object.entries(theme[mode] ?? {})
      .map(([k, v]) => `${k}:${v};`)
      .join("");
    // The product's own tokens go last so they win where both define one.
    return vars + own;
  }, [vars, theme, mode]);

  async function readFile(file: File) {
    const text = await file.text();
    onChange(text.slice(0, 120_000));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          Backdrop document
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".html,.htm,text/html"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-grid px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
          >
            <Upload size={11} aria-hidden="true" />
            Load .html
          </button>
          <button
            type="button"
            onClick={() => onChange(SAMPLE)}
            className="rounded-full border border-grid px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
          >
            Insert example
          </button>
          <button
            type="button"
            onClick={() => {
              // Read at the moment of opening rather than at mount: the theme
              // can be toggled while this page is open.
              if (!preview) setVars(readPaletteVars());
              setPreview((v) => !v);
            }}
            disabled={!value.trim()}
            className="inline-flex items-center gap-2 rounded-full border border-grid px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
          >
            {preview ? (
              <EyeOff size={11} aria-hidden="true" />
            ) : (
              <Eye size={11} aria-hidden="true" />
            )}
            Preview
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const f = e.dataTransfer.files?.[0];
          if (!f) return;
          e.preventDefault();
          void readFile(f);
        }}
        rows={10}
        spellCheck={false}
        placeholder="<style> … </style>  — or drop an .html file here"
        className="w-full resize-y rounded-lg border border-grid bg-ground px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-muted/50 focus:border-signal"
      />

      <p className="text-[11px] leading-relaxed text-ink-muted">
        Rendered behind this product&rsquo;s panel inside a sandboxed frame, so
        it may run scripts without being able to reach the site around it. The
        site palette is injected, so{" "}
        <code className="text-telemetry">var(--signal)</code>,{" "}
        <code className="text-telemetry">var(--grid)</code> and{" "}
        <code className="text-telemetry">var(--ink)</code> all work. Leave the
        background transparent — the page supplies it.
      </p>

      <label className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          Opacity
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={opacity}
          onChange={(e) => onOpacity(Number(e.target.value))}
          className="h-1 flex-1 accent-signal"
        />
        <span className="w-10 text-right font-mono text-[11px] tabular-nums text-ink">
          {opacity}%
        </span>
      </label>

      {preview && value.trim() ? (
        <div className="flex flex-col gap-2">
          {/* Same proportions and the same ground as a real panel, so the
              preview is judged on the geometry it will actually have. At a
              fixed 220px, anything laid out against the panel's height — most
              backdrops, since they fill it — was cropped to a letterbox that
              showed the middle band and nothing else. */}
          <div
            style={{ ...(panelVars ? parseVars(panelVars) : {}) }}
            className="relative aspect-[16/9] w-full overflow-hidden rounded-card border border-grid bg-ground"
          >
            <iframe
              sandbox="allow-scripts"
              title="Backdrop preview"
              srcDoc={backdropDocument(value, panelVars)}
              className="size-full border-0"
              style={{
                opacity: opacity / 100,
                background: "transparent",
                colorScheme: "normal",
              }}
            />
            <span className="pointer-events-none absolute left-3 top-3 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
              Preview &middot; pointer not forwarded here
            </span>
          </div>

          {Object.keys(theme[mode] ?? {}).length > 0 ? (
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted/70">
              Using this document&rsquo;s own {mode} palette
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
