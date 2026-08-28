"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Printer,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ChevronDown,
  Copy,
  ClipboardPaste,
  X,
} from "lucide-react";
import type { ResumeDoc, ResumeEntry } from "@/models/Resume";
import type { IdentityDoc } from "@/models/Identity";
import type { SkillCategory } from "@/models/Skill";
import type { ServiceDoc } from "@/models/Service";
import type { ProjectDoc } from "@/models/Project";
import type { ExperienceDoc } from "@/models/Experience";
import { useCollection } from "@/lib/admin/useCollection";
import { useDragReorder } from "@/lib/admin/useDragReorder";
import CollectionLayout from "./CollectionLayout";
import { PageHead, Panel, Field, Button, SaveBar, ListEditor } from "./ui";
import ResumeSheet from "./ResumeSheet";

/** Roughly what one line of a bullet holds at the printed size. */
const LINE_BUDGET = 105;

/**
 * False on the server and through hydration, true from the next render on.
 *
 * The print copy is portalled into `document.body`, and a portal rendered on
 * the very first client pass puts a node there that the server never sent.
 * React reports a hydration mismatch (#418) and recovers by regenerating the
 * tree from the root — and that regeneration reapplies the root element's
 * attributes, wiping the theme class the pre-paint script had just written.
 * It is why this page alone came back from a reload in the wrong theme while
 * every other page merely flashed.
 *
 * Waiting one render costs nothing: the copy is invisible until printing. The
 * shape is the same `useSyncExternalStore` the palette hint uses to ask a
 * browser-only question without upsetting hydration.
 */
const subscribeNever = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

const SECTION_LABEL: Record<string, string> = {
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  services: "Services",
};

const AUTO_SECTIONS = new Set(["education", "skills", "services"]);

type Kind = "experience" | "projects";

export default function ResumeEditor({
  resumes,
  experience,
  projects,
  identity,
  skills,
  services,
  siteUrl,
}: {
  resumes: ResumeDoc[];
  experience: ExperienceDoc[];
  projects: ProjectDoc[];
  identity: IdentityDoc | null;
  skills: SkillCategory[];
  services: ServiceDoc[];
  /** Pre-fills a new sheet. Empty when the admin is running on localhost. */
  siteUrl: string;
}) {
  const c = useCollection<ResumeDoc>("resumes", resumes);

  /**
   * Entries picked up with Copy, waiting to be pasted.
   *
   * Plain component state, deliberately. It only has to survive switching
   * between sheets — which it does, because this component stays mounted while
   * the selection changes — and keeping it out of storage means there is no
   * server-versus-client difference for hydration to trip over.
   */
  const [clip, setClip] = useState<ResumeEntry[]>([]);

  const current = c.current;

  function patchEntries(kind: Kind, next: ResumeEntry[]) {
    if (!current) return;
    c.patch(current._id, { [kind]: next } as Partial<ResumeDoc>);
  }

  function addEntry(kind: Kind, seed?: ResumeEntry) {
    if (!current) return;
    patchEntries(kind, [
      ...current[kind],
      seed ?? { sourceId: "", title: "", subtitle: "", time: "", bullets: [], enabled: true },
    ]);
  }

  /** Appends the clipboard to a section, leaving it loaded for the next sheet. */
  function paste(kind: Kind) {
    if (!current || clip.length === 0) return;
    patchEntries(kind, [...current[kind], ...clip.map((entry) => ({ ...entry }))]);
  }

  /**
   * Copies the whole sheet.
   *
   * Saved immediately rather than held as an unsaved draft: a copy exists to
   * be edited away from the original, and an unsaved one that vanishes on a
   * mis-click would take the edits with it.
   */
  async function duplicate(sheet: ResumeDoc) {
    const { _id, ...rest } = sheet;
    void _id;
    await c.create({
      ...rest,
      name: `${sheet.name} (copy)`,
      // Placed after everything else rather than on top of the sheet it came
      // from, which would leave two rows claiming the same position.
      order: c.items.length,
    });
  }

  return (
    <div>
      <PageHead
        index="08"
        title="Résumé PDF"
        lead="One page, printed"
        action={
          <Button
            variant="primary"
            onClick={() =>
              c.create({
                name: "New résumé",
                headline: identity?.profile.role ?? "",
                website: siteUrl,
              })
            }
          >
            <Plus size={12} aria-hidden="true" className="mr-1.5 inline" />
            Add résumé
          </Button>
        }
      />

      <CollectionLayout
        items={c.items}
        selected={c.selected}
        onSelect={c.setSelected}
        onReorder={c.reorder}
        label={(r) => r.name}
        emptyHint="No sheets yet. Add one — each is a separate CV, so you can keep a version per kind of role."
      >
        {current ? (
          <>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
              {/* ── editor ── */}
              <div className="min-w-0">
                <Panel title="Sheet">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Name"
                      value={current.name}
                      onChange={(v) => c.patch(current._id, { name: v })}
                      hint="Only you see this — “Full-stack”, “QA / Automation”"
                    />
                    <Field
                      label="Headline"
                      value={current.headline}
                      onChange={(v) => c.patch(current._id, { headline: v })}
                      placeholder={identity?.profile.role ?? "Full-Stack Developer"}
                      hint="Printed under your name. Blank uses the site’s role."
                    />
                  </div>
                  <Field
                    label="Portfolio address"
                    value={current.website}
                    onChange={(v) => c.patch(current._id, { website: v })}
                    placeholder="your-site.vercel.app"
                    hint="Printed on the contact line, without the https://"
                  />
                </Panel>

                <SectionList
                  resume={current}
                  onChange={(sections) => c.patch(current._id, { sections })}
                />

                <EntryPanel
                  kind="experience"
                  title="Experience"
                  entries={current.experience}
                  onChange={(next) => patchEntries("experience", next)}
                  onAdd={(seed) => addEntry("experience", seed)}
                  clip={clip}
                  onCopy={(entry) => setClip((prev) => [...prev, entry])}
                  onPaste={() => paste("experience")}
                  onClearClip={() => setClip([])}
                  sources={experience.map((e) => ({
                    id: e._id,
                    label: `${e.role}${e.organization ? ` — ${e.organization}` : ""}`,
                    seed: {
                      sourceId: e._id,
                      title: e.role,
                      subtitle: e.organization,
                      time: e.time,
                      bullets: [],
                      enabled: true,
                    },
                    suggestions: e.achievements,
                  }))}
                />

                <EntryPanel
                  kind="projects"
                  title="Projects"
                  entries={current.projects}
                  onChange={(next) => patchEntries("projects", next)}
                  onAdd={(seed) => addEntry("projects", seed)}
                  clip={clip}
                  onCopy={(entry) => setClip((prev) => [...prev, entry])}
                  onPaste={() => paste("projects")}
                  onClearClip={() => setClip([])}
                  sources={projects.map((p) => ({
                    id: p._id,
                    label: p.name,
                    seed: {
                      sourceId: p._id,
                      title: p.name,
                      subtitle: p.role,
                      time: p.year,
                      bullets: [],
                      enabled: true,
                    },
                    suggestions: p.highlights,
                  }))}
                />
              </div>

              {/* ── the page itself ── */}
              <Preview
                resume={current}
                identity={identity}
                skills={skills}
                services={services}
              />
            </div>

            {/* Printing sits at the far end, away from Delete: it acts on the
                output rather than on the record, and it is the one button here
                whose neighbour being Delete would matter. */}
            <SaveBar
              state={c.state}
              error={c.error}
              onSave={() => c.save(current)}
              trailing={
                <Button variant="ghost" onClick={() => window.print()}>
                  <Printer size={12} aria-hidden="true" className="mr-1.5 inline" />
                  Print / Save PDF
                </Button>
              }
            >
              <Button variant="ghost" onClick={() => duplicate(current)}>
                <Copy size={12} aria-hidden="true" className="mr-1.5 inline" />
                Duplicate
              </Button>
              <Button variant="danger" onClick={() => c.remove(current._id)}>
                <Trash2 size={12} aria-hidden="true" className="mr-1.5 inline" />
                Delete
              </Button>
            </SaveBar>
          </>
        ) : null}
      </CollectionLayout>
    </div>
  );
}

/* ── which sections print, and in what order ── */

function SectionList({
  resume,
  onChange,
}: {
  resume: ResumeDoc;
  onChange: (v: ResumeDoc["sections"]) => void;
}) {
  const { rowProps, ordered, dragId } = useDragReorder(
    resume.sections,
    (next) => onChange(next.map((s, i) => ({ ...s, order: i }))),
    (s) => s.key
  );

  return (
    <Panel title="Sections">
      <div className="flex flex-col gap-1.5">
        {ordered.map((s) => (
          <div
            key={s.key}
            {...rowProps(s.key)}
            className={`flex items-center gap-3 rounded-lg border bg-ground px-3 py-2 transition-[opacity,scale] duration-200 ${
              dragId === s.key ? "scale-[0.99] border-signal opacity-40" : "border-grid"
            }`}
          >
            <GripVertical
              size={13}
              aria-hidden="true"
              className="shrink-0 cursor-grab text-ink-muted/40"
            />
            <span className="flex-1 text-sm text-ink">{SECTION_LABEL[s.key]}</span>
            {AUTO_SECTIONS.has(s.key) ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted/60">
                auto
              </span>
            ) : null}
            <button
              type="button"
              aria-pressed={s.enabled}
              title={s.enabled ? "Printed" : "Not printed"}
              onClick={() =>
                onChange(
                  resume.sections.map((r) =>
                    r.key === s.key ? { ...r, enabled: !r.enabled } : r
                  )
                )
              }
              className={`grid size-7 shrink-0 place-items-center rounded border transition-colors ${
                s.enabled
                  ? "border-signal text-signal"
                  : "border-grid text-ink-muted/40 hover:text-ink-muted"
              }`}
            >
              {s.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-ink-muted">
        Sections marked <strong>auto</strong> read straight from the site — edit
        them in Identity, Tech Forge or Service Bay. Experience and Projects are
        written here, short enough to fit.
      </p>
    </Panel>
  );
}

/* ── one kind of authored entry ── */

type Source = {
  id: string;
  label: string;
  seed: ResumeEntry;
  suggestions: string[];
};

function EntryPanel({
  kind,
  title,
  entries,
  sources,
  onChange,
  onAdd,
  clip,
  onCopy,
  onPaste,
  onClearClip,
}: {
  kind: Kind;
  title: string;
  entries: ResumeEntry[];
  sources: Source[];
  onChange: (v: ResumeEntry[]) => void;
  onAdd: (seed?: ResumeEntry) => void;
  clip: ResumeEntry[];
  onCopy: (entry: ResumeEntry) => void;
  onPaste: () => void;
  onClearClip: () => void;
}) {
  const [picking, setPicking] = useState(false);

  const ids = entries.map((e, i) => `${kind}-${i}`);
  const { rowProps, ordered, orderedIds, dragId } = useDragReorder(
    entries,
    onChange,
    (_e, i) => ids[i]
  );

  const update = (index: number, patch: Partial<ResumeEntry>) =>
    onChange(ordered.map((e, i) => (i === index ? { ...e, ...patch } : e)));

  return (
    <Panel title={`${title} — ${entries.filter((e) => e.enabled).length} printed`}>
      {ordered.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-ink-muted">
          Nothing here yet. Start from something in the archive and trim it, or
          add a blank entry.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {ordered.map((e, i) => {
          const src = sources.find((s) => s.id === e.sourceId);
          const unused = (src?.suggestions ?? []).filter((b) => !e.bullets.includes(b));
          return (
            <div
              key={orderedIds[i]}
              data-flip-id={orderedIds[i]}
              {...rowProps(orderedIds[i])}
              className={`rounded-card border bg-ground p-4 transition-[opacity,scale] duration-200 ${
                dragId === orderedIds[i] ? "scale-[0.99] border-signal opacity-40" : "border-grid"
              } ${e.enabled ? "" : "opacity-60"}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <GripVertical
                  size={13}
                  aria-hidden="true"
                  className="shrink-0 cursor-grab text-ink-muted/40"
                />
                <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  {String(i + 1).padStart(2, "0")}
                  {src ? <span className="ml-2 text-ink-muted/60">from {src.label}</span> : null}
                </span>
                <button
                  type="button"
                  aria-pressed={e.enabled}
                  title={e.enabled ? "Printed" : "Kept, not printed"}
                  onClick={() => update(i, { enabled: !e.enabled })}
                  className={`grid size-7 place-items-center rounded border transition-colors ${
                    e.enabled ? "border-signal text-signal" : "border-grid text-ink-muted/40"
                  }`}
                >
                  {e.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  type="button"
                  aria-label={`Copy ${e.title || "entry"}`}
                  title="Copy this entry, to paste into another sheet"
                  onClick={() => onCopy({ ...e, bullets: [...e.bullets] })}
                  className="grid size-7 place-items-center rounded border border-grid text-ink-muted transition-colors hover:border-signal hover:text-signal"
                >
                  <Copy size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Remove entry"
                  onClick={() => onChange(ordered.filter((_, j) => j !== i))}
                  className="grid size-7 place-items-center rounded border border-grid text-ink-muted transition-colors hover:border-danger hover:text-danger"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
                <Field
                  label={kind === "experience" ? "Role" : "Project"}
                  value={e.title}
                  onChange={(v) => update(i, { title: v })}
                />
                <Field
                  label={kind === "experience" ? "Organisation" : "Your role"}
                  value={e.subtitle}
                  onChange={(v) => update(i, { subtitle: v })}
                />
                <Field
                  label="Time"
                  value={e.time}
                  onChange={(v) => update(i, { time: v })}
                  placeholder="Jul – Oct 2025"
                />
              </div>

              <div className="mt-3">
                <ListEditor
                  label={`Bullets — ${e.bullets.length}`}
                  items={e.bullets}
                  onChange={(bullets) => update(i, { bullets })}
                  placeholder="One achievement, one line"
                />
                <BulletBudget bullets={e.bullets} />
              </div>

              {unused.length > 0 ? (
                <details className="mt-3">
                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-signal">
                    From the archive ({unused.length})
                  </summary>
                  <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                    {unused.map((b) => (
                      <li key={b}>
                        <button
                          type="button"
                          onClick={() => update(i, { bullets: [...e.bullets, b] })}
                          className="w-full rounded-lg border border-grid px-3 py-2 text-left text-[12px] leading-snug text-ink-muted transition-colors hover:border-signal hover:text-ink"
                        >
                          + {b}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] leading-relaxed text-ink-muted/70">
                    Added as-is — trim the wording afterwards.
                  </p>
                </details>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          aria-expanded={picking}
          disabled={sources.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-grid px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
        >
          <Plus size={11} aria-hidden="true" />
          From the archive
          <ChevronDown
            size={11}
            aria-hidden="true"
            className={`transition-transform ${picking ? "rotate-180" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={() => onAdd()}
          className="rounded-full border border-grid px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
        >
          Blank entry
        </button>

        {/* Only offered when there is something to paste, so the row does not
            carry a permanently dead button. The clipboard is not emptied by
            pasting — the usual reason to copy an entry is to put it on more
            than one sheet. */}
        {clip.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={onPaste}
              title={clip.map((x) => x.title || "untitled").join(", ")}
              className="inline-flex items-center gap-2 rounded-full border border-signal px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-signal transition-colors hover:bg-signal hover:text-on-signal"
            >
              <ClipboardPaste size={11} aria-hidden="true" />
              Paste {clip.length}
            </button>
            <button
              type="button"
              onClick={onClearClip}
              aria-label="Empty the clipboard"
              title="Empty the clipboard"
              className="grid size-7 place-items-center rounded-full text-ink-muted transition-colors hover:text-danger"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>

      {/* Opens in the flow rather than floating over it. The panel this sits in
          clips its own overflow to keep its corners rounded, which cut a
          floating menu off a few pixels below the button — so the list pushes
          the rest of the panel down instead of hovering above it. */}
      {picking ? (
        <ul className="m-0 flex max-h-72 list-none flex-col gap-1 overflow-y-auto rounded-card border border-grid bg-ground p-1.5">
          {sources.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(s.seed);
                  setPicking(false);
                }}
                className="flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-panel-2"
              >
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                {s.suggestions.length > 0 ? (
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-muted">
                    {s.suggestions.length} bullets
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

/**
 * Flags bullets long enough to wrap.
 *
 * A wrapped bullet costs two lines instead of one, which is the usual reason a
 * sheet that looked like it fitted does not. Counting characters is a rough
 * proxy, but it is one the writer can act on while typing — the page gauge
 * only says the total is wrong, not which line to cut.
 */
function BulletBudget({ bullets }: { bullets: string[] }) {
  const over = bullets.filter((b) => b.length > LINE_BUDGET);
  if (over.length === 0) return null;
  return (
    <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-warn">
      {over.length} bullet{over.length === 1 ? "" : "s"} over ~{LINE_BUDGET} characters — each
      will wrap onto a second printed line.
    </p>
  );
}

/* ── the page, and whether it fits on one ── */

function Preview({
  resume,
  identity,
  skills,
  services,
}: {
  resume: ResumeDoc;
  identity: IdentityDoc | null;
  skills: SkillCategory[];
  services: ServiceDoc[];
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [fill, setFill] = useState(0);
  const mounted = useMounted();

  /**
   * Measures the content against one page.
   *
   * Watched rather than computed on save: the number is only useful while the
   * wording is being cut, and by the time you press save you have already
   * spent the effort. A `ResizeObserver` on the content catches every keypress
   * that changes the height, including the ones that only matter because a
   * bullet wrapped.
   */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const measure = () => {
      const page = el.parentElement;
      if (!page) return;
      const usable = page.clientHeight;
      if (!usable) return;
      setFill(el.scrollHeight / usable);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pct = Math.round(fill * 100);
  const over = fill > 1;
  const tight = fill > 0.9 && !over;

  const tone = over
    ? "border-danger text-danger"
    : tight
      ? "border-warn text-warn"
      : "border-grid text-ink-muted";

  return (
    <div className="cv-sticky">
      <div className={`mb-3 rounded-card border ${tone} px-4 py-3`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
            {over ? "Over one page" : tight ? "Nearly full" : "Fits one page"}
          </span>
          <span className="font-mono text-[11px] tabular-nums">{pct}%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-grid">
          <div
            className={`h-full transition-[width] duration-200 ${
              over ? "bg-danger" : tight ? "bg-warn" : "bg-ok"
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        {over ? (
          <p className="mt-2 text-[11px] leading-relaxed">
            Spilling onto a second page. Cut roughly{" "}
            <strong>{Math.ceil((fill - 1) * 42)} lines</strong>, or turn an entry off.
          </p>
        ) : (
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            Print from the bar below, choose “Save as PDF”, then upload it in
            Identity → Resume / CV.
          </p>
        )}
      </div>

      <div className="cv-frame">
        <div className="cv-sheet">
          <div ref={bodyRef}>
            <ResumeSheet
              resume={resume}
              identity={identity}
              skills={skills}
              services={services}
            />
          </div>
        </div>
      </div>

      {/* The copy that actually prints, as a direct child of <body>.
          Print hides every sibling outright rather than merely making them
          invisible — hidden-but-laid-out siblings were what padded a one-page
          CV out to two. Same component, same props, so it cannot drift from
          the preview above. */}
      {mounted
        ? createPortal(
            <div className="cv-print" aria-hidden="true">
              <div className="cv-sheet">
                <ResumeSheet
                  resume={resume}
                  identity={identity}
                  skills={skills}
                  services={services}
                />
              </div>
            </div>,
            document.body
          )
        : null}

    </div>
  );
}
