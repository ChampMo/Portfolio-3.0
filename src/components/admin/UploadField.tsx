"use client";

import { useRef, useState } from "react";
import {
  Upload,
  Link2,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  FileText,
  ImageIcon,
  X,
} from "lucide-react";

type Kind = "image" | "document";

/**
 * Cloudinary and Drive URLs are long and carry no meaning at a glance, and a
 * column of them made the media panel unreadable. Show the file name instead;
 * the full URL is still one click away via the open button.
 */
function fileLabel(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
    if (!last) return "Linked file";
    return last.length > 42 ? `${last.slice(0, 39)}…` : last;
  } catch {
    // Not a parseable URL — show it raw rather than hiding it entirely.
    return url.length > 42 ? `${url.slice(0, 39)}…` : url;
  }
}

/**
 * Single-asset field.
 *
 * The input controls stay collapsed until needed — an always-visible dropzone
 * per asset made the media panel several screens tall for what is usually a
 * set-once value. Once something is set, the field is a one-line summary with
 * a Replace action.
 *
 * Two input modes: upload (signed server-side via /api/upload) or paste a URL,
 * which is the only way to point at a Google Drive file.
 */
export default function UploadField({
  label,
  value,
  onChange,
  kind = "image",
  folder,
  visible,
  onVisibleChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind?: Kind;
  folder?: string;
  /** When provided, renders a show/hide toggle for the public site. */
  visible?: boolean;
  onVisibleChange?: (v: boolean) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlDraft, setUrlDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      if (folder) body.append("folder", folder);

      // No Content-Type header: the browser must set the multipart boundary.
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error || `Upload failed (${res.status})`);
        return;
      }
      onChange(data.url);
      setOpen(false);
    } catch {
      setError("Network error during upload");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function commitUrl() {
    const v = urlDraft.trim();
    if (!v) return;
    onChange(v);
    setUrlDraft("");
    setOpen(false);
  }

  const accept =
    kind === "image"
      ? "image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
      : "application/pdf,image/png,image/jpeg";

  return (
    <div className="rounded-card border border-grid bg-ground p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {label}
        </span>
        {onVisibleChange ? (
          <button
            type="button"
            onClick={() => onVisibleChange(!visible)}
            title={visible ? "Visible on the public site" : "Hidden from the public site"}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
              visible
                ? "border-ok/50 bg-ok/10 text-ok"
                : "border-warn/50 bg-warn/10 text-warn"
            }`}
          >
            {visible ? <Eye size={10} aria-hidden="true" /> : <EyeOff size={10} aria-hidden="true" />}
            {visible ? "Visible" : "Hidden"}
          </button>
        ) : null}
      </div>

      {/* summary row */}
      <div className="flex items-center gap-2.5">
        {value ? (
          kind === "image" ? (
            // Arbitrary remote hosts (Cloudinary, Drive…) — next/image would
            // need every possible domain declared in remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="size-9 shrink-0 rounded object-cover"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded border border-grid text-ink-muted">
              <FileText size={14} aria-hidden="true" />
            </span>
          )
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded border border-dashed border-grid text-ink-muted/50">
            {kind === "image" ? (
              <ImageIcon size={14} aria-hidden="true" />
            ) : (
              <FileText size={14} aria-hidden="true" />
            )}
          </span>
        )}

        {value ? (
          <span
            title={value}
            className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink"
          >
            {fileLabel(value)}
          </span>
        ) : (
          <span className="min-w-0 flex-1 font-mono text-[11px] text-ink-muted/60">
            Not set
          </span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {value ? (
            <>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                className="grid size-7 place-items-center rounded border border-grid text-ink-muted transition-colors hover:border-signal hover:text-signal"
              >
                <ExternalLink size={12} aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => onChange("")}
                title="Remove"
                aria-label={`Remove ${label}`}
                className="grid size-7 place-items-center rounded border border-grid text-ink-muted transition-colors hover:border-danger hover:text-danger"
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded border border-grid px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
          >
            {open ? (
              <>
                <X size={11} aria-hidden="true" /> Cancel
              </>
            ) : (
              <>
                <Upload size={11} aria-hidden="true" /> {value ? "Replace" : "Set"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* collapsed until the user asks for it */}
      {open ? (
        <div className="mt-3 border-t border-grid pt-3">
          <div className="mb-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                mode === "upload"
                  ? "bg-panel-2 text-signal"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                mode === "url" ? "bg-panel-2 text-signal" : "text-ink-muted hover:text-ink"
              }`}
            >
              Paste URL
            </button>
          </div>

          {mode === "upload" ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) upload(f);
              }}
              className="rounded border border-dashed border-grid px-3 py-3 text-center"
            >
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:text-signal disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={12} aria-hidden="true" /> Choose a file or drop it here
                  </>
                )}
              </button>
              <p className="mt-1 font-mono text-[9px] tracking-[0.06em] text-ink-muted/60">
                {kind === "image" ? "PNG · JPG · WEBP · SVG" : "PDF · PNG · JPG"} · max 8 MB
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                autoFocus
                value={urlDraft}
                placeholder="https://drive.google.com/…"
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitUrl();
                  }
                }}
                className="w-full rounded border border-grid bg-panel px-3 py-2 font-mono text-[11px] text-ink outline-none transition-colors placeholder:text-ink-muted/50 focus:border-signal"
              />
              <button
                type="button"
                onClick={commitUrl}
                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-grid px-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
              >
                <Link2 size={11} aria-hidden="true" /> Set
              </button>
            </div>
          )}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 font-mono text-[10px] text-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="mt-2 text-[10px] leading-relaxed text-ink-muted/70">{hint}</p>
      ) : null}
    </div>
  );
}
