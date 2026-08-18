"use client";

import { useRef, useState } from "react";
import { useFlip } from "@/lib/admin/useFlip";
import { useDragReorder, occurrenceIds } from "@/lib/admin/useDragReorder";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";

/**
 * Multi-image field with drag-to-reorder thumbnails and multi-file upload.
 * Used for the slideshow gallery and for project gallery blocks.
 */
export default function GalleryEditor({
  label,
  images,
  onChange,
  folder,
}: {
  label: string;
  images: string[];
  onChange: (v: string[]) => void;
  folder?: string;
}) {
  const list = Array.isArray(images) ? images : [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  // The same image may legitimately appear twice in one gallery, so identity
  // is the URL plus which occurrence it is — stable across reorders, unlike
  // the URL plus its index.
  const ids = occurrenceIds(list);
  const { rowProps, ordered, orderedIds, dragId } = useDragReorder(
    list,
    onChange,
    (_src, i) => ids[i]
  );

  useFlip(gridRef, orderedIds.join("|"));

  async function uploadMany(files: FileList | File[]) {
    setBusy(true);
    setError("");
    const added: string[] = [];
    try {
      // Sequential rather than parallel: keeps the ordering deterministic and
      // avoids hammering the upload endpoint with a whole folder at once.
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        if (folder) body.append("folder", folder);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!res.ok || !data.url) {
          setError(data.error || `Upload failed for ${file.name}`);
          break;
        }
        added.push(data.url);
      }
      if (added.length) onChange([...list, ...added]);
    } catch {
      setError("Network error during upload");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {label}
        </span>
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-muted">
          {list.length} image{list.length === 1 ? "" : "s"}
        </span>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          // Only treat this as a file drop; an internal thumbnail drag has no files.
          if (e.dataTransfer.files?.length) {
            e.preventDefault();
            uploadMany(e.dataTransfer.files);
          }
        }}
        ref={gridRef}
        className="flex flex-wrap gap-3 rounded-card border border-grid bg-ground p-3"
      >
        {ordered.map((src, i) => (
          <div
            key={orderedIds[i]}
            data-flip-id={orderedIds[i]}
            {...rowProps(orderedIds[i])}
            // No ring on the tile being passed over any more: the thumbnails
            // part to open the slot the image will land in, which shows the
            // destination more directly than highlighting a neighbour.
            className={`group relative size-20 cursor-grab overflow-hidden rounded border border-grid transition-[opacity,scale] duration-200 active:cursor-grabbing ${
              dragId === orderedIds[i] ? "scale-90 opacity-40" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-cover" />
            <span className="absolute left-0.5 top-0.5 rounded bg-ground/80 px-1 font-mono text-[9px] tabular-nums text-ink-muted">
              {i + 1}
            </span>
            <span className="absolute right-0.5 top-0.5 text-ink-muted/60 opacity-0 transition-opacity group-hover:opacity-100">
              <GripVertical size={12} />
            </span>
            <button
              type="button"
              aria-label={`Remove image ${i + 1}`}
              // Filtered against what is on screen, not the stored array —
              // during a drag those are two different orders.
              onClick={() => onChange(ordered.filter((_, j) => j !== i))}
              className="absolute inset-x-0 bottom-0 grid h-6 place-items-center bg-ground/85 text-ink-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100"
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
        ))}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadMany(e.target.files);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="grid size-20 place-items-center rounded border border-dashed border-grid text-ink-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <span className="flex flex-col items-center gap-1">
              <Plus size={16} aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em]">Add</span>
            </span>
          )}
        </button>
      </div>

      <p className="font-mono text-[9px] tracking-[0.08em] text-ink-muted/70">
        Drag thumbnails to reorder · drop files here to add
      </p>
      {error ? (
        <p role="alert" className="font-mono text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
