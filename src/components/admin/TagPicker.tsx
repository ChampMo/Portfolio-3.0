"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Check, Pencil, Trash2, Loader2, X, Search } from "lucide-react";
import { ListEditor } from "./ui";

export type PoolTag = { _id: string; name: string; kind: string; usageCount: number };

/** Below this many entries the list is scannable and a filter is only noise. */
const SEARCH_FROM = 10;

/**
 * A ListEditor backed by a shared vocabulary.
 *
 * Selected values still live on the document as plain strings (so nothing
 * about rendering changes), but the pool below offers every name already in
 * use across the site — picking beats retyping, and it stops "Next.js" and
 * "NextJS" drifting apart across projects.
 */
export default function TagPicker({
  label,
  kind,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  /** "tech" for stacks, "tag" for categories. */
  kind: "tech" | "tag";
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [pool, setPool] = useState<PoolTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  /** Filters the pool below. Never touches what is selected above. */
  const [query, setQuery] = useState("");
  /** Bumped after any pool mutation to trigger a refetch. */
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);

  const selected = Array.isArray(items) ? items : [];
  /**
   * Captured once at mount. Used to backfill names this document already
   * carries but the pool has never seen — reading `selected` inside the
   * effect instead would make it rerun on every keystroke.
   */
  const seedFrom = useRef(selected);

  useEffect(() => {
    let cancelled = false;

    // The whole flow sits behind awaits inside the effect rather than in a
    // memoised callback: state is only ever set from the async continuation,
    // never synchronously during the effect body.
    (async () => {
      try {
        const fetchPool = async () => {
          const res = await fetch(`/api/tags?kind=${kind}`, { cache: "no-store" });
          const data = (await res.json().catch(() => [])) as PoolTag[];
          return Array.isArray(data) ? data : [];
        };

        let data = await fetchPool();

        const known = new Set(data.map((t) => t.name.toLowerCase()));
        const missing = seedFrom.current.filter((s) => !known.has(s.toLowerCase()));
        if (missing.length > 0) {
          await Promise.all(
            missing.map((name) =>
              fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, kind }),
              }).catch(() => {})
            )
          );
          data = await fetchPool();
        }

        if (!cancelled) setPool(data);
      } catch {
        if (!cancelled) setError("Could not load the shared list");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, reload]);

  function toggle(name: string) {
    const has = selected.some((s) => s.toLowerCase() === name.toLowerCase());
    onChange(has ? selected.filter((s) => s.toLowerCase() !== name.toLowerCase()) : [...selected, name]);
  }

  async function handleChange(next: string[]) {
    onChange(next);
    // Register genuinely new names in the pool.
    const known = new Set(pool.map((t) => t.name.toLowerCase()));
    const fresh = next.filter((n) => !known.has(n.toLowerCase()));
    if (fresh.length === 0) return;

    for (const name of fresh) {
      // A rejection used to be swallowed whole: the chip appeared on the
      // document, the shared list never gained the name, and nothing said why.
      try {
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, kind }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error || `Could not add "${name}" to the shared list`);
        }
      } catch {
        setError(`Could not add "${name}" to the shared list`);
      }
    }
    refresh();
  }

  async function rename(id: string) {
    const name = draftName.trim();
    if (!name) return;
    const before = pool.find((t) => t._id === id)?.name;

    const res = await fetch(`/api/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(data.error || "Rename failed");
      return;
    }

    // Keep this document's own selection in step with the cascade the server
    // just applied to every other document.
    if (before) {
      onChange(selected.map((s) => (s.toLowerCase() === before.toLowerCase() ? name : s)));
    }
    setEditingId(null);
    setError("");
    refresh();
  }

  async function remove(id: string) {
    const t = pool.find((x) => x._id === id);
    if (!t) return;
    const msg =
      t.usageCount > 0
        ? `"${t.name}" is used ${t.usageCount} time(s). Removing it from the shared list will NOT remove it from those items. Continue?`
        : `Remove "${t.name}" from the shared list?`;
    if (!window.confirm(msg)) return;

    await fetch(`/api/tags/${id}`, { method: "DELETE" }).catch(() => {});
    refresh();
  }

  const unused = pool.filter(
    (t) => !selected.some((s) => s.toLowerCase() === t.name.toLowerCase())
  );

  // Managing shows the whole pool (including what is already picked, since
  // renaming and deleting apply to those too); browsing shows only what can
  // still be added.
  const source = managing ? pool : unused;
  const q = query.trim().toLowerCase();
  const shown = q ? source.filter((t) => t.name.toLowerCase().includes(q)) : source;
  const searchable = pool.length >= SEARCH_FROM;

  return (
    <div className="flex flex-col gap-3">
      <ListEditor
        label={label}
        items={selected}
        chip
        placeholder={placeholder}
        onChange={handleChange}
      />

      <div className="rounded-card border border-grid bg-ground p-3">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            Shared list &middot; {kind === "tech" ? "tech" : "tags"}
          </span>
          <button
            type="button"
            onClick={() => {
              setManaging((m) => !m);
              setEditingId(null);
            }}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:text-signal"
          >
            {managing ? (
              <>
                <X size={11} aria-hidden="true" /> Done
              </>
            ) : (
              <>
                <Pencil size={11} aria-hidden="true" /> Manage
              </>
            )}
          </button>
        </div>

        {!loading && searchable ? (
          <div className="relative mb-2.5">
            <Search
              size={12}
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // Escape clears rather than bubbling up and closing the editor.
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setQuery("");
                }
              }}
              placeholder={`Search ${pool.length} ${kind === "tech" ? "tech" : "tags"}…`}
              aria-label="Search the shared list"
              className="w-full rounded-lg border border-grid bg-panel py-1.5 pl-8 pr-16 font-mono text-[11px] text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-signal [&::-webkit-search-cancel-button]:hidden"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 font-mono text-[10px] tabular-nums text-ink-muted transition-colors hover:text-signal"
              >
                {shown.length}
                <X size={11} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <p className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Loading…
          </p>
        ) : pool.length === 0 ? (
          <p className="text-[11px] text-ink-muted">
            Nothing shared yet — anything you type above is added here automatically.
          </p>
        ) : shown.length === 0 && q ? (
          <p className="text-[11px] text-ink-muted">
            Nothing matches &ldquo;{query.trim()}&rdquo;. Type it in the field above to add it.
          </p>
        ) : managing ? (
          <ul className="flex list-none flex-col gap-1.5 p-0">
            {shown.map((t) => (
              <li
                key={t._id}
                className="flex items-center gap-2 rounded-lg border border-grid bg-panel px-2.5 py-1.5"
              >
                {editingId === t._id ? (
                  <>
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void rename(t._id);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="min-w-0 flex-1 rounded border border-grid bg-ground px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-signal"
                    />
                    <button
                      type="button"
                      aria-label="Save name"
                      onClick={() => void rename(t._id)}
                      className="grid size-6 place-items-center rounded border border-grid text-ink-muted hover:border-signal hover:text-signal"
                    >
                      <Check size={11} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-[0.06em]">
                      {t.name}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink-muted">
                      {t.usageCount} use{t.usageCount === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Rename ${t.name}`}
                      onClick={() => {
                        setEditingId(t._id);
                        setDraftName(t.name);
                      }}
                      className="grid size-6 place-items-center rounded border border-grid text-ink-muted hover:border-signal hover:text-signal"
                    >
                      <Pencil size={11} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${t.name}`}
                      onClick={() => void remove(t._id)}
                      className="grid size-6 place-items-center rounded border border-grid text-ink-muted hover:border-danger hover:text-danger"
                    >
                      <Trash2 size={11} aria-hidden="true" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : shown.length === 0 ? (
          <p className="text-[11px] text-ink-muted">Everything in the shared list is already added.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {shown.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => toggle(t.name)}
                className="inline-flex items-center gap-1.5 rounded-full border border-grid px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
              >
                <Plus size={10} aria-hidden="true" />
                {t.name}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-2 font-mono text-[10px] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
