"use client";

import { useCallback, useState } from "react";
import { useSave } from "./useSave";

type WithId = { _id: string; order?: number; published?: boolean };

/**
 * Client-side CRUD for the ordered collections. Keeps a local list so the UI
 * stays responsive, and re-syncs from the server response after each write so
 * server-side defaults (order, slug, timestamps) are reflected immediately.
 */
export function useCollection<T extends WithId>(resource: string, initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const [selected, setSelected] = useState<string | null>(initial[0]?._id ?? null);
  const { state, error, run } = useSave();

  const current = items.find((i) => i._id === selected) ?? null;

  const patch = useCallback((id: string, changes: Partial<T>) => {
    setItems((prev) => prev.map((i) => (i._id === id ? { ...i, ...changes } : i)));
  }, []);

  const create = useCallback(
    async (defaults: Record<string, unknown>) => {
      const created = (await run(`/api/${resource}`, {
        method: "POST",
        body: JSON.stringify(defaults),
      })) as T | null;
      if (created?._id) {
        setItems((prev) => [...prev, created]);
        setSelected(created._id);
      }
      return created;
    },
    [resource, run]
  );

  const save = useCallback(
    async (item: T) => {
      const { _id, ...body } = item;
      const updated = (await run(`/api/${resource}/${_id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })) as T | null;
      if (updated?._id) {
        setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
      }
    },
    [resource, run]
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await run(`/api/${resource}/${id}`, { method: "DELETE" });
      if (res) {
        setItems((prev) => {
          const next = prev.filter((i) => i._id !== id);
          setSelected((sel) => (sel === id ? (next[0]?._id ?? null) : sel));
          return next;
        });
      }
    },
    [resource, run]
  );

  const reorder = useCallback(
    async (ids: string[]) => {
      // Optimistic: reflect the new order before the round-trip resolves.
      setItems((prev) => {
        const map = new Map(prev.map((i) => [i._id, i]));
        return ids.map((id) => map.get(id)!).filter(Boolean);
      });
      await run(`/api/${resource}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ ids }),
      });
    },
    [resource, run]
  );

  const move = useCallback(
    (id: string, delta: number) => {
      const i = items.findIndex((x) => x._id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= items.length) return;
      const ids = items.map((x) => x._id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      void reorder(ids);
    },
    [items, reorder]
  );

  return {
    items,
    selected,
    current,
    setSelected,
    patch,
    create,
    save,
    remove,
    move,
    reorder,
    state,
    error,
  };
}
