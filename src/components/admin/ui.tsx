"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { useFlip } from "@/lib/admin/useFlip";
import { useDragReorder, occurrenceIds } from "@/lib/admin/useDragReorder";

/* ── layout ── */

export function PageHead({
  index,
  title,
  lead,
  action,
}: {
  index: string;
  title: string;
  lead?: string;
  action?: React.ReactNode;
}) {
  const headRef = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /**
   * Collapses the header once it sticks.
   *
   * Driven by a sentinel above it rather than a scroll listener: the browser
   * reports the crossing once, instead of the page recomputing a threshold on
   * every frame of every scroll. The class goes straight onto the node, so
   * nothing here re-renders the form below.
   */
  useEffect(() => {
    const head = headRef.current;
    const sentinel = sentinelRef.current;
    if (!head || !sentinel) return;

    const io = new IntersectionObserver(([entry]) =>
      head.classList.toggle("is-stuck", !entry.isIntersecting)
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <header ref={headRef} className="admin-head">
        <div className="admin-head-eyebrow flex items-baseline gap-4">
          <span className="font-mono text-[11px] tracking-[0.16em] tabular-nums text-signal">
            {index}
          </span>
          <h1 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            {title}
          </h1>
          <span aria-hidden="true" className="h-px flex-1 bg-grid" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {lead ? (
            <h2 className="admin-head-title font-display uppercase leading-[0.95]">
              {lead}
            </h2>
          ) : null}
          {action}
        </div>
      </header>
    </>
  );
}

export function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 overflow-hidden rounded-card border border-grid bg-panel">
      {title ? (
        <div className="border-b border-grid px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {title}
        </div>
      ) : null}
      <div className="grid gap-4 p-5">{children}</div>
    </section>
  );
}

/* ── fields ── */

const inputCls =
  "w-full rounded-lg border border-grid bg-ground px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/50 focus:border-signal";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
      {hint ? <span className="text-[11px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} resize-y leading-relaxed`}
      />
    </label>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[var(--signal)]"
      />
      <span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {label}
        </span>
        {hint ? <span className="block text-[11px] text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * Editor for the string-array fields (stack, deliverables, highlights…).
 * Enter adds; the list is the source of truth so order is preserved.
 */
export function ListEditor({
  label,
  items: itemsProp,
  onChange,
  placeholder,
  chip,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  chip?: boolean;
}) {
  // Second line of defense: the real fix is normalizing data at the read
  // layer (lib/data/normalize.ts), but a form control should never throw
  // just because a caller passed an unexpected shape.
  const items = Array.isArray(itemsProp) ? itemsProp : [];
  const [draft, setDraft] = useState("");
  /** The entry a rejected duplicate collided with, flashed then cleared. */
  const [dupe, setDupe] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Values carry no id of their own, so identity is the value plus which
  // occurrence it is — stable across reorders in a way `value + index` is not.
  const ids = occurrenceIds(items);
  const { rowProps, ordered, orderedIds, dragId } = useDragReorder(
    items,
    onChange,
    (_it, i) => ids[i]
  );

  // Animates every reorder, including the live ones fired mid-drag.
  useFlip(listRef, orderedIds.join("|"));

  // Clears the duplicate flash. Set from a timer rather than during the
  // effect body, so this stays out of the compiler's set-state-in-effect rule.
  useEffect(() => {
    if (!dupe) return;
    const t = window.setTimeout(() => setDupe(null), 1600);
    return () => window.clearTimeout(t);
  }, [dupe]);

  /**
   * Adds the draft, refusing anything the list already holds.
   *
   * The comparison is case-insensitive, which a plain `includes` was not.
   * Chips render uppercase, so "react" typed alongside an existing "React"
   * produced two rows that looked identical, two React children keyed on the
   * same string, and a doubled usage count in the shared list — all from a
   * value the editor believed was new.
   *
   * A rejected duplicate flashes the entry it collided with instead of failing
   * silently: emptying the box and changing nothing else read as a broken
   * Add button.
   */
  function add() {
    const v = draft.trim();
    if (!v) return;

    const existing = items.find((it) => it.toLowerCase() === v.toLowerCase());
    if (existing) {
      setDraft("");
      setDupe(existing);
      return;
    }

    onChange([...items, v]);
    setDraft("");
    setDupe(null);
  }



  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>

      <div className="flex gap-2">
        <input
          value={draft}
          placeholder={placeholder ?? "Type and press Enter"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={inputCls}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-lg border border-grid px-4 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
        >
          Add
        </button>
      </div>

      {dupe ? (
        <p role="status" className="font-mono text-[10px] text-danger">
          &ldquo;{dupe}&rdquo; is already in this list.
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-[11px] text-ink-muted">Nothing added yet.</p>
      ) : chip ? (
        <div ref={listRef} className="flex flex-wrap gap-2">
          {ordered.map((it, i) => (
            <span
              key={orderedIds[i]}
              data-flip-id={orderedIds[i]}
              {...rowProps(orderedIds[i])}
              title="Drag to reorder"
              className={`inline-flex cursor-grab items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors active:cursor-grabbing ${
                dragId === orderedIds[i]
                  ? "border-signal bg-panel-2 text-signal"
                  : dupe === it
                    ? "border-danger text-danger"
                    : "border-grid text-ink-muted"
              }`}
            >
              <GripVertical
                size={10}
                aria-hidden="true"
                className="-ml-1 text-ink-muted/40"
              />
              {it}
              <button
                type="button"
                aria-label={`Remove ${it}`}
                title={`Remove ${it}`}
                // Without this the mousedown starts a drag instead of a click.
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onClick={() => onChange(ordered.filter((_, j) => j !== i))}
                className="text-ink-muted transition-colors hover:text-danger"
              >
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div ref={listRef} className="flex list-none flex-col gap-1.5 p-0">
          {ordered.map((it, i) => (
            <div
              key={orderedIds[i]}
              data-flip-id={orderedIds[i]}
              {...rowProps(orderedIds[i])}
              className={`group flex items-start gap-2 rounded-lg border bg-ground px-2 py-2 text-sm transition-colors ${
                dragId === orderedIds[i]
                  ? "border-signal bg-panel-2"
                  : dupe === it
                    ? "border-danger"
                    : "border-grid"
              }`}
            >
              <span
                aria-hidden="true"
                title="Drag to reorder"
                className="mt-0.5 grid shrink-0 cursor-grab place-items-center text-ink-muted/40 transition-colors group-hover:text-ink-muted active:cursor-grabbing"
              >
                <GripVertical size={13} />
              </span>
              <span className="flex-1 leading-snug">{it}</span>
              <IconBtn
                label={`Remove ${it}`}
                danger
                onClick={() => onChange(ordered.filter((_, j) => j !== i))}
              >
                <X size={12} />
              </IconBtn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-6 place-items-center rounded border border-grid font-mono text-[11px] transition-colors disabled:opacity-30 ${
        danger ? "hover:border-danger hover:text-danger" : "hover:border-signal hover:text-signal"
      }`}
    >
      {children}
    </button>
  );
}

/* ── actions ── */

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "border-signal text-signal hover:bg-signal hover:text-on-signal",
    ghost: "border-grid text-ink-muted hover:border-ink hover:text-ink",
    danger: "border-grid text-ink-muted hover:border-danger hover:text-danger",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveBar({
  state,
  error,
  onSave,
  children,
  trailing,
}: {
  state: SaveState;
  error?: string;
  onSave: () => void;
  children?: React.ReactNode;
  /**
   * Actions pinned to the far end of the bar.
   *
   * Everything on the left edits the record in front of you — save it, copy
   * it, delete it. Something that acts on the *output* rather than the record
   * does not belong in that run of buttons, and putting a printer next to a
   * delete is asking for the wrong click.
   */
  trailing?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-8 flex flex-wrap items-center gap-4 border-t border-grid bg-ground/95 px-6 py-4 backdrop-blur md:-mx-10 md:px-10">
      <Button variant="primary" onClick={onSave} disabled={state === "saving"}>
        {state === "saving" ? "Saving…" : "Save changes"}
      </Button>
      {children}
      <span
        role="status"
        aria-live="polite"
        className={`font-mono text-[11px] tracking-[0.08em] ${
          state === "error" ? "text-danger" : "text-ok"
        }`}
      >
        {state === "saved" ? "Saved" : state === "error" ? error || "Save failed" : ""}
      </span>
      {trailing ? <span className="ml-auto flex items-center gap-3">{trailing}</span> : null}
    </div>
  );
}
