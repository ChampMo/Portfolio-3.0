"use client";

import { Check } from "lucide-react";

export type LinkableProject = {
  _id: string;
  name: string;
  year: string;
  published: boolean;
  /**
   * Every image the project already holds — its cover plus each gallery block.
   * Optional because only the product editor needs them, where they are
   * offered as ready-made icons and screenshots.
   */
  images?: string[];
};

/**
 * Ticks projects that demonstrate a service. Stored on the service as
 * `linkedProjectIds`, and rendered as links inside the patch-bay readout.
 */
export default function ProjectLinker({
  projects,
  selected,
  onChange,
}: {
  projects: LinkableProject[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const picked = new Set(Array.isArray(selected) ? selected : []);

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Preserve the archive's own order rather than click order, so the public
    // list reads the same way the rail does.
    onChange(projects.filter((p) => next.has(p._id)).map((p) => p._id));
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          Linked projects
        </span>
        <p className="text-[11px] text-ink-muted">
          No projects yet — add some under Archives first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          Linked projects
        </span>
        <span className="font-mono text-[10px] tabular-nums text-ink-muted">
          {picked.size} selected
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {projects.map((p) => {
          const on = picked.has(p._id);
          return (
            <button
              key={p._id}
              type="button"
              onClick={() => toggle(p._id)}
              aria-pressed={on}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                on
                  ? "border-signal bg-panel-2"
                  : "border-grid bg-ground hover:border-ink-muted"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm">{p.name}</span>
                <span className="font-mono text-[10px] tracking-[0.08em] text-ink-muted">
                  {p.year || "—"}
                  {p.published ? "" : " · draft"}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded border transition-colors ${
                  on ? "border-signal text-signal" : "border-grid text-transparent"
                }`}
              >
                <Check size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
