"use client";

import { useRef, useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { useFlip } from "@/lib/admin/useFlip";
import { useDragReorder } from "@/lib/admin/useDragReorder";
import type { SkillDoc, SkillCategory } from "@/models/Skill";
import { useSave } from "@/lib/admin/useSave";
import { PageHead, Panel, Field, ListEditor, Button, SaveBar } from "./ui";

const DEFAULTS: SkillCategory[] = [
  { name: "LANGUAGES", items: [], order: 0 },
  { name: "FRAMEWORKS", items: [], order: 1 },
  { name: "DATABASE", items: [], order: 2 },
  { name: "TOOLS & TESTING", items: [], order: 3 },
];

/**
 * Categories have no server-side id, but both React keys and FLIP need one
 * that survives edits. Keying by name would change on every keystroke while
 * renaming — remounting the input and stealing focus — and keying by index
 * would change on every reorder, which is exactly when FLIP must track the
 * element. So each row gets a client-only id, stripped again before saving.
 */
type Row = SkillCategory & { key: string };

let seq = 0;
const withKey = (c: SkillCategory): Row => ({ ...c, key: `cat_${seq++}` });

export default function SkillsEditor({ initial }: { initial: SkillDoc | null }) {
  const [cats, setCats] = useState<Row[]>(() =>
    (initial?.categories?.length
      ? [...initial.categories].sort((a, b) => a.order - b.order)
      : DEFAULTS
    ).map(withKey)
  );
  const { state, error, run } = useSave();
  const listRef = useRef<HTMLDivElement | null>(null);
  // `ordered` tracks the pointer mid-drag; `cats` catches up when it ends.
  const { rowProps, ordered, dragId } = useDragReorder(
    cats,
    (next) => setCats(next.map((c, k) => ({ ...c, order: k }))),
    (c) => c.key
  );

  useFlip(listRef, ordered.map((c) => c.key).join("|"));

  // Keyed rather than indexed: rows render in the drag preview order, which
  // is not the order `cats` is in until the drag ends.
  function update(key: string, patch: Partial<Row>) {
    setCats((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }


  return (
    <div>
      <PageHead
        index="02"
        title="Tech Forge"
        lead="Skill categories"
        action={
          <Button
            onClick={() =>
              setCats((prev) => [
                ...prev,
                withKey({ name: "NEW CATEGORY", items: [], order: prev.length }),
              ])
            }
          >
            + Add category
          </Button>
        }
      />

      <div ref={listRef}>
      {ordered.map((cat, i) => (
        <div
          key={cat.key}
          data-flip-id={cat.key}
          {...rowProps(cat.key)}
          className={`rounded-card transition-[opacity,scale] duration-200 ${
            dragId === cat.key ? "scale-[0.98] opacity-40" : ""
          }`}
        >
        <Panel title={`Category ${String(i + 1).padStart(2, "0")}`}>
          <div className="flex flex-wrap items-end gap-3">
            <span
              aria-hidden="true"
              title="Drag to reorder"
              className="cursor-grab pb-3 text-ink-muted/40 transition-colors hover:text-ink-muted active:cursor-grabbing"
            >
              <GripVertical size={15} />
            </span>
            <div className="min-w-[220px] flex-1">
              <Field label="Name" value={cat.name} onChange={(v) => update(cat.key, { name: v })} />
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button variant="danger" onClick={() => setCats((p) => p.filter((_, j) => j !== i))}>
                <span className="inline-flex items-center gap-2">
                  <Trash2 size={12} aria-hidden="true" />
                  Remove
                </span>
              </Button>
            </div>
          </div>

          <ListEditor
            label="Items"
            items={cat.items}
            chip
            placeholder="e.g. TypeScript"
            onChange={(items) => update(cat.key, { items })}
          />
        </Panel>
        </div>
      ))}
      </div>

      {cats.length === 0 ? (
        <p className="mb-5 rounded-card border border-grid bg-panel p-6 text-sm text-ink-muted">
          No categories yet. The Tech Forge section is hidden on the public site
          until at least one category has items.
        </p>
      ) : null}

      <SaveBar
        state={state}
        error={error}
        onSave={() =>
          run("/api/skills", {
            method: "PUT",
            body: JSON.stringify({
              categories: cats.map((c, i) => ({
                name: c.name,
                items: c.items,
                order: i,
              })),
            }),
          })
        }
      />
    </div>
  );
}
