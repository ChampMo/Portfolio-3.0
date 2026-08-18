"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FLIP_MS } from "./useFlip";

/**
 * Native HTML5 drag-and-drop reordering, shared by every sortable list in the
 * admin: document lists, content blocks, skill categories, gallery thumbnails
 * and the string-array chip editors.
 *
 * Deliberately dependency-free — these lists are short, and a drag library
 * would be more weight than the feature is worth.
 *
 * ── Why items move during the drag ──
 * Each list used to commit its new order on `drop`. That meant the list sat
 * perfectly still for the entire drag and then arrived rearranged in a single
 * step: there was nothing for the reorder animation to show, because by the
 * time anything changed the drag was already over. Neighbours parting to make
 * room *while the pointer travels* is the part that reads as drag-and-drop.
 *
 * The preview order lives here rather than being pushed to the owner on every
 * dragover, so a drag is still exactly one save, fired when it ends.
 *
 * ── Guards ──
 * Swapping moves a neighbour under the pointer, which fires dragover again and
 * would swap straight back forever. Two things stop that:
 *
 *  1. The pointer must clear the target's midpoint *in the direction of
 *     travel*. After a swap the pointer sits on the side it already passed, so
 *     the reverse swap never qualifies.
 *  2. A cooldown ignores events while the reorder animation is still sliding
 *     things under the cursor.
 *
 * The axis for that midpoint test is chosen per target by asking which way the
 * two elements are actually separated, so one implementation handles vertical
 * lists and wrapping grids without being told which it is.
 */
export function useDragReorder<T>(
  items: T[],
  onCommit: (ordered: T[]) => void,
  getId: (item: T, index: number) => string
) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  /** Local order during a drag. Null when no drag is in flight. */
  const [preview, setPreview] = useState<string[] | null>(null);
  /** Ignores dragover while a reorder animation is still moving things. */
  const lockedUntil = useRef(0);
  /** The element being carried, for working out how targets are separated. */
  const dragNode = useRef<HTMLElement | null>(null);

  const baseIds = useMemo(() => items.map(getId), [items, getId]);
  const ids = preview ?? baseIds;

  // What to render, in preview order. Falls back to the owner's order if the
  // preview no longer describes the same set (an item added mid-drag).
  const ordered = useMemo(() => {
    if (!preview) return items;
    const map = new Map(items.map((item, i) => [getId(item, i), item]));
    const out = preview.map((id) => map.get(id)).filter((x): x is T => x !== undefined);
    return out.length === items.length ? out : items;
  }, [items, preview, getId]);

  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    // These lists nest — chips sit inside a draggable skill category, a
    // gallery inside a draggable block. Without this, dragging the inner item
    // picks up its container instead.
    e.stopPropagation();
    setDragId(id);
    dragNode.current = e.currentTarget as HTMLElement;
    lockedUntil.current = 0;
    e.dataTransfer.effectAllowed = "move";
    // Firefox refuses to start a drag unless some data is set.
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const onDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      // Not our drag — a file being dropped onto the gallery, say. Left
      // untouched so the container's own upload handler still sees it.
      if (!dragId) return;

      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      if (id !== overId) setOverId(id);
      if (dragId === id) return;
      if (performance.now() < lockedUntil.current) return;

      const from = ids.indexOf(dragId);
      const to = ids.indexOf(id);
      if (from < 0 || to < 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const midY = rect.top + rect.height / 2;

      // Whichever axis actually separates the two elements is the one the
      // pointer has to cross. In a column that is always Y; among chips on one
      // wrapped row it is X, and between rows it is Y again.
      const src = dragNode.current?.getBoundingClientRect();
      const horizontal = src
        ? Math.abs(midX - (src.left + src.width / 2)) >
          Math.abs(midY - (src.top + src.height / 2))
        : false;

      const forward = from < to;
      const passed = horizontal
        ? forward
          ? e.clientX > midX
          : e.clientX < midX
        : forward
          ? e.clientY > midY
          : e.clientY < midY;
      if (!passed) return;

      const next = [...ids];
      next.splice(to, 0, next.splice(from, 1)[0]);
      lockedUntil.current = performance.now() + FLIP_MS;
      setPreview(next);
    },
    [dragId, ids, overId]
  );

  /**
   * Ends the drag and saves the result.
   *
   * Bound to dragend as well as drop, because releasing outside any row fires
   * no drop event at all — and by then the rows have already moved on screen.
   * Handling drop alone left that order showing but never written.
   */
  const finish = useCallback(() => {
    const settled = preview;
    setDragId(null);
    setOverId(null);
    setPreview(null);
    dragNode.current = null;
    lockedUntil.current = 0;

    if (!settled) return;
    if (!settled.some((id, i) => id !== baseIds[i])) return;

    const map = new Map(items.map((item, i) => [getId(item, i), item]));
    const out = settled.map((id) => map.get(id)).filter((x): x is T => x !== undefined);
    if (out.length === items.length) onCommit(out);
  }, [preview, baseIds, items, getId, onCommit]);

  /** Spread onto each sortable element. */
  const rowProps = useCallback(
    (id: string) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => onDragStart(e, id),
      onDragOver: (e: React.DragEvent) => onDragOver(e, id),
      onDrop: (e: React.DragEvent) => {
        if (!dragId) return;
        e.preventDefault();
        e.stopPropagation();
        finish();
      },
      onDragEnd: (e: React.DragEvent) => {
        e.stopPropagation();
        finish();
      },
      "data-dragging": dragId === id ? "true" : undefined,
      "data-drag-over": overId === id && dragId !== id ? "true" : undefined,
    }),
    [dragId, overId, onDragStart, onDragOver, finish]
  );

  return { rowProps, ordered, orderedIds: ids, dragId, overId };
}

/**
 * Stable ids for a list of plain strings, disambiguating repeats by which
 * occurrence they are.
 *
 * Lists of values rather than records — gallery URLs, stack chips — have no id
 * of their own, and the obvious `value + index` breaks the moment anything
 * moves: the same item is handed a different id by the reorder it is supposed
 * to be animating through, so the animation sees an unfamiliar element and
 * skips it. Numbering by occurrence instead survives reordering, because
 * equal values are interchangeable by definition.
 */
export function occurrenceIds(values: string[]): string[] {
  const seen = new Map<string, number>();
  return values.map((v) => {
    const n = seen.get(v) ?? 0;
    seen.set(v, n + 1);
    return n === 0 ? v : `${v}#${n}`;
  });
}
