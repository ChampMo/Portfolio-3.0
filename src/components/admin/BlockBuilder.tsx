"use client";

import { useRef } from "react";
import {
  Type,
  AlignLeft,
  Link2,
  Image as ImageIcon,
  Quote,
  Minus,
  Trash2,
  GripVertical,
} from "lucide-react";
import type { ProjectBlock } from "@/models/Project";
import type { GalleryContent, ProjectBlockType } from "@/lib/content/constants";
import { isGalleryContent } from "@/lib/content/constants";
import GalleryEditor from "./GalleryEditor";
import { useFlip } from "@/lib/admin/useFlip";
import { useDragReorder } from "@/lib/admin/useDragReorder";

const ADD_BUTTONS: Array<{ type: ProjectBlockType; label: string; Icon: typeof Type }> = [
  { type: "heading", label: "Heading", Icon: Type },
  { type: "paragraph", label: "Paragraph", Icon: AlignLeft },
  { type: "link", label: "Link", Icon: Link2 },
  { type: "gallery", label: "Gallery", Icon: ImageIcon },
  { type: "quote", label: "Quote", Icon: Quote },
  { type: "divider", label: "Divider", Icon: Minus },
];

const inputCls =
  "w-full rounded-lg border border-grid bg-ground px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/50 focus:border-signal";

function newId() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyContent(type: ProjectBlockType) {
  if (type === "gallery") return { title: "", images: [], height: 300 } satisfies GalleryContent;
  return "";
}

/**
 * The article builder: an ordered list of typed content blocks rendered by
 * the public project page. Blocks reorder by dragging the grip.
 */
export default function BlockBuilder({
  blocks,
  onChange,
}: {
  blocks: ProjectBlock[];
  onChange: (v: ProjectBlock[]) => void;
}) {
  const list = Array.isArray(blocks) ? blocks : [];
  const listRef = useRef<HTMLDivElement | null>(null);
  // `ordered` tracks the pointer mid-drag; `list` catches up when it ends.
  const { rowProps, ordered, dragId } = useDragReorder(
    list,
    onChange,
    (b) => b.id
  );

  useFlip(listRef, ordered.map((b) => b.id).join("|"));

  function add(type: ProjectBlockType) {
    onChange([...list, { id: newId(), type, content: emptyContent(type) }]);
  }

  function update(id: string, content: ProjectBlock["content"]) {
    onChange(list.map((b) => (b.id === id ? { ...b, content } : b)));
  }

  function remove(id: string) {
    onChange(list.filter((b) => b.id !== id));
  }

  return (
    <div ref={listRef} className="flex flex-col gap-3">
      {list.length === 0 ? (
        <p className="rounded-card border border-dashed border-grid px-4 py-6 text-center text-[11px] leading-relaxed text-ink-muted">
          No content blocks yet. Use the buttons below to build the project
          write-up — it appears on the project&rsquo;s own page.
        </p>
      ) : null}

      {ordered.map((block, i) => {
        const gallery = isGalleryContent(block.content)
          ? block.content
          : { title: "", images: [], height: 300 };

        return (
          <div
            key={block.id}
            data-flip-id={block.id}
            {...rowProps(block.id)}
            // The ring on the block being passed over is gone: blocks now part
            // to open the gap this one will drop into, which shows the landing
            // place without a second highlight competing with it.
            className={`group relative rounded-card border border-grid bg-panel p-4 pl-9 transition-[opacity,scale] duration-200 ${
              dragId === block.id ? "scale-[0.98] opacity-40" : ""
            }`}
          >
            <span
              aria-hidden="true"
              title="Drag to reorder"
              className="absolute left-2 top-4 cursor-grab text-ink-muted/35 transition-colors group-hover:text-ink-muted active:cursor-grabbing"
            >
              <GripVertical size={14} />
            </span>

            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
                {String(i + 1).padStart(2, "0")} · {block.type}
              </span>
              <button
                type="button"
                aria-label="Remove block"
                title="Remove block"
                onClick={() => remove(block.id)}
                className="grid size-7 place-items-center rounded border border-grid text-ink-muted transition-colors hover:border-danger hover:text-danger"
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </div>

            {block.type === "heading" ? (
              <input
                value={typeof block.content === "string" ? block.content : ""}
                onChange={(e) => update(block.id, e.target.value)}
                placeholder="Section heading…"
                className={`${inputCls} font-display text-lg uppercase`}
              />
            ) : null}

            {block.type === "paragraph" ? (
              <textarea
                rows={5}
                value={typeof block.content === "string" ? block.content : ""}
                onChange={(e) => update(block.id, e.target.value)}
                placeholder="Write the details here…"
                className={`${inputCls} resize-y leading-relaxed`}
              />
            ) : null}

            {block.type === "quote" ? (
              <textarea
                rows={2}
                value={typeof block.content === "string" ? block.content : ""}
                onChange={(e) => update(block.id, e.target.value)}
                placeholder="A pulled-out quote…"
                className={`${inputCls} resize-y italic`}
              />
            ) : null}

            {block.type === "link" ? (
              <input
                type="url"
                value={typeof block.content === "string" ? block.content : ""}
                onChange={(e) => update(block.id, e.target.value)}
                placeholder="https://…"
                className={`${inputCls} font-mono text-telemetry`}
              />
            ) : null}

            {block.type === "divider" ? (
              <p className="py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                A horizontal rule — nothing to configure.
              </p>
            ) : null}

            {block.type === "gallery" ? (
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                      Gallery title
                    </span>
                    <input
                      value={gallery.title}
                      onChange={(e) =>
                        update(block.id, { ...gallery, title: e.target.value })
                      }
                      placeholder="Optional"
                      className={inputCls}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                      Height (px)
                    </span>
                    <input
                      type="number"
                      step={10}
                      min={80}
                      value={gallery.height}
                      onChange={(e) =>
                        update(block.id, {
                          ...gallery,
                          height: Math.max(80, Number(e.target.value) || 300),
                        })
                      }
                      className={`${inputCls} text-right tabular-nums`}
                    />
                  </label>
                </div>
                <GalleryEditor
                  label="Images"
                  images={gallery.images}
                  onChange={(images) => update(block.id, { ...gallery, images })}
                  folder="portfolio/projects"
                />
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2 rounded-full border border-grid bg-panel p-2">
        {ADD_BUTTONS.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => add(type)}
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:bg-panel-2 hover:text-signal"
          >
            <Icon size={13} className="text-signal" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
