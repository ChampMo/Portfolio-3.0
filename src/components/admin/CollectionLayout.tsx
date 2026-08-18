"use client";

import { useRef } from "react";
import { GripVertical, Eye, EyeOff, Trash2 } from "lucide-react";
import { useFlip } from "@/lib/admin/useFlip";
import { Button } from "./ui";
import { useDragReorder } from "@/lib/admin/useDragReorder";

type Item = { _id: string; published?: boolean };

/**
 * Two-pane shell shared by the services / experience / projects editors:
 * an ordered list on the left, the selected item's form on the right.
 *
 * Rows are reordered by dragging the grip handle.
 */
export default function CollectionLayout<T extends Item>({
  items,
  selected,
  onSelect,
  onReorder,
  label,
  emptyHint,
  rowAction,
  children,
}: {
  items: T[];
  selected: string | null;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  label: (item: T, index: number) => string;
  emptyHint: string;
  /** Optional control pinned to the right of each row, e.g. the star toggle. */
  rowAction?: (item: T) => React.ReactNode;
  children: React.ReactNode;
}) {
  const listRef = useRef<HTMLUListElement | null>(null);
  // `ordered` follows the pointer during a drag; `items` only catches up once
  // the drag ends and the new order is written.
  const { rowProps, ordered } = useDragReorder(
    items,
    (next) => onReorder(next.map((i) => i._id)),
    (item) => item._id
  );

  // Animates each step of the reorder rather than snapping rows into place.
  useFlip(listRef, ordered.map((i) => i._id).join("|"));

  if (items.length === 0) {
    return (
      <p className="rounded-card border border-grid bg-panel p-6 text-sm leading-relaxed text-ink-muted">
        {emptyHint}
      </p>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr] lg:items-start">
      {/* `admin-list` pins this column under the sticky header and gives it its
          own scrollbar, so a long list no longer drags the form along with it
          — and the form no longer drags the list. */}
      <ul ref={listRef} className="admin-list flex list-none flex-col gap-1.5 p-0">
        {ordered.map((item, i) => {
          const on = item._id === selected;
          const draft = item.published === false;
          return (
            <li
              key={item._id}
              data-flip-id={item._id}
              {...rowProps(item._id)}
              // The row being carried is dimmed and set slightly back, so the
              // gap it leaves behind reads as the space it came out of. No
              // ring on the hovered row any more — the rows now part to show
              // where it will land, which says the same thing without a
              // second marker competing with the selected row's border.
              className="group flex items-stretch gap-1.5 rounded-lg transition-[opacity,scale] duration-200 data-[dragging=true]:scale-[0.97] data-[dragging=true]:opacity-40"
            >
              <span
                aria-hidden="true"
                title="Drag to reorder"
                className="grid w-5 shrink-0 cursor-grab place-items-center text-ink-muted/40 transition-colors group-hover:text-ink-muted active:cursor-grabbing"
              >
                <GripVertical size={14} />
              </span>

              <button
                type="button"
                onClick={() => onSelect(item._id)}
                aria-current={on ? "true" : undefined}
                className={`relative flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-3 text-left font-mono text-[11px] tracking-[0.08em] transition-colors ${
                  on
                    ? "border-signal bg-panel-2 text-ink"
                    : "border-grid bg-panel text-ink-muted hover:border-ink-muted hover:text-ink"
                } ${draft ? "opacity-60" : ""}`}
              >
                <span className={`shrink-0 tabular-nums ${on ? "text-signal" : ""}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate">{label(item, i)}</span>
                {draft ? (
                  <span
                    title="Not published — hidden from the public site"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warn/50 bg-warn/10 px-1.5 py-0.5 text-[9px] uppercase tracking-normal text-warn"
                  >
                    <EyeOff size={9} aria-hidden="true" />
                    Draft
                  </span>
                ) : (
                  <Eye size={11} aria-hidden="true" className="shrink-0 text-ink-muted/35" />
                )}
              </button>

              {rowAction ? (
                <span className="flex shrink-0 items-center">{rowAction(item)}</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="min-w-0">{children}</div>
    </div>
  );
}


/** Banner shown above the editor form when the selected item is a draft. */
export function DraftNotice({ published }: { published: boolean }) {
  if (published) return null;
  return (
    <div
      role="status"
      className="mb-5 flex items-center gap-3 rounded-card border border-warn/40 bg-warn/10 px-4 py-3"
    >
      <EyeOff size={15} className="shrink-0 text-warn" aria-hidden="true" />
      <p className="font-mono text-[11px] leading-relaxed tracking-[0.06em] text-warn">
        This item is a draft — it is hidden from the public site. Turn on
        &ldquo;Published&rdquo; below to show it.
      </p>
    </div>
  );
}

export function DeleteButton({
  onDelete,
  what,
}: {
  onDelete: () => void;
  what: string;
}) {
  return (
    <Button
      variant="danger"
      onClick={() => {
        // Deletion is irreversible and there is no undo, so confirm explicitly.
        if (window.confirm(`Delete "${what}"? This cannot be undone.`)) onDelete();
      }}
    >
      <span className="inline-flex items-center gap-2">
        <Trash2 size={12} aria-hidden="true" />
        Delete
      </span>
    </Button>
  );
}
