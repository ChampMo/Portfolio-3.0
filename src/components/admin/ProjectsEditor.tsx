"use client";

import { Star, Eye } from "lucide-react";
import type { ProjectDoc } from "@/models/Project";
import { PROJECT_STATUSES } from "@/lib/content/constants";
import { useCollection } from "@/lib/admin/useCollection";
import {
  PageHead,
  Panel,
  Field,
  TextArea,
  Select,
  ListEditor,
  Toggle,
  Button,
  SaveBar,
} from "./ui";
import CollectionLayout, { DeleteButton, DraftNotice } from "./CollectionLayout";
import UploadField from "./UploadField";
import TagPicker from "./TagPicker";
import BlockBuilder from "./BlockBuilder";

export default function ProjectsEditor({ initial }: { initial: ProjectDoc[] }) {
  const c = useCollection<ProjectDoc>("projects", initial);

  return (
    <div>
      <PageHead
        index="04"
        title="Mission Archives"
        lead="Projects"
        action={
          <Button
            variant="primary"
            onClick={() =>
              c.create({ name: "New project", status: "DEPLOYED", published: false })
            }
          >
            + Add project
          </Button>
        }
      />

      <CollectionLayout
        items={c.items}
        selected={c.selected}
        onSelect={c.setSelected}
        onReorder={c.reorder}
        label={(p) => p.name}
        emptyHint="No projects yet. Add one — the Mission Archives rail is hidden on the public site while this is empty."
        // The view count used to sit here beside the star. It only rendered
        // when a project had views, so the stars stopped lining up down the
        // column and the pill crowded whichever titles happened to be long —
        // a number nobody scans the list *for* was pushing around the two
        // things they do. It lives in the editor now, with the rest of what
        // is true about one project.
        rowAction={(p) => (
          <button
            type="button"
            aria-pressed={p.featured}
            aria-label={p.featured ? `Unstar ${p.name}` : `Star ${p.name}`}
            title={
              p.featured
                ? "Starred — shown on the home page rail"
                : "Not starred — only in the full archive"
            }
            onClick={() => {
              // Saves on the spot rather than waiting for the form's Save
              // button: starring is a one-click decision made while scanning
              // the list, often on a project other than the one being edited.
              const next = { ...p, featured: !p.featured };
              c.patch(p._id, { featured: next.featured });
              void c.save(next);
            }}
            className={`grid size-9 place-items-center rounded-lg border transition-colors ${
              p.featured
                ? "border-signal/50 bg-signal/10 text-signal"
                : "border-grid bg-panel text-ink-muted/40 hover:border-ink-muted hover:text-ink-muted"
            }`}
          >
            <Star size={14} aria-hidden="true" fill={p.featured ? "currentColor" : "none"} />
          </button>
        )}
      >
        {c.current ? (
          <>
            <DraftNotice published={c.current.published} />
            <Panel title="Identity">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={c.current.name}
                  onChange={(v) => c.patch(c.current!._id, { name: v })}
                />
                <Field
                  label="Codename"
                  value={c.current.codename}
                  onChange={(v) => c.patch(c.current!._id, { codename: v.toUpperCase() })}
                  hint="Machine label above the card title"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Year"
                  value={c.current.year}
                  onChange={(v) => c.patch(c.current!._id, { year: v })}
                />
                <Field
                  label="Your role"
                  value={c.current.role}
                  onChange={(v) => c.patch(c.current!._id, { role: v })}
                />
                <Select
                  label="Status"
                  value={c.current.status}
                  options={PROJECT_STATUSES}
                  onChange={(v) =>
                    c.patch(c.current!._id, { status: v as ProjectDoc["status"] })
                  }
                />
              </div>
              <Field
                label="Slug"
                value={c.current.slug ?? ""}
                onChange={(v) => c.patch(c.current!._id, { slug: v })}
                hint="Leave blank to generate from the name"
              />

              {/* Read-only, and sat next to the slug on purpose: the slug is
                  the address the counter counts. */}
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Views
                </span>
                <p className="flex items-center gap-2 font-mono text-[13px] tabular-nums text-ink">
                  <Eye size={13} aria-hidden="true" className="text-ink-muted/60" />
                  {(c.current.views ?? 0).toLocaleString()}
                  <span className="font-sans text-[11px] tabular-nums text-ink-muted">
                    {c.current.views === 1 ? "visit" : "visits"} to this
                    project&rsquo;s own page
                  </span>
                </p>
              </div>
            </Panel>

            <Panel title="Copy">
              <TextArea
                label="Summary"
                value={c.current.summary}
                onChange={(v) => c.patch(c.current!._id, { summary: v })}
                rows={2}
                placeholder="One line shown on the card"
              />
              <TextArea
                label="Description"
                value={c.current.description}
                onChange={(v) => c.patch(c.current!._id, { description: v })}
                rows={5}
              />
              <ListEditor
                label="Highlights"
                items={c.current.highlights}
                onChange={(v) => c.patch(c.current!._id, { highlights: v })}
                placeholder="e.g. Reduced first-paint by 40%"
              />
            </Panel>

            <Panel title="Meta">
              <TagPicker
                label="Stack"
                kind="tech"
                items={c.current.stack}
                onChange={(v) => c.patch(c.current!._id, { stack: v })}
                placeholder="e.g. PostgreSQL"
              />
              <TagPicker
                label="Tags"
                kind="tag"
                items={c.current.tags}
                onChange={(v) => c.patch(c.current!._id, { tags: v })}
                placeholder="e.g. Full-Stack"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Repository URL"
                  value={c.current.links?.repo ?? ""}
                  onChange={(v) =>
                    c.patch(c.current!._id, {
                      links: { repo: v, live: c.current!.links?.live ?? "" },
                    })
                  }
                />
                <Field
                  label="Live URL"
                  value={c.current.links?.live ?? ""}
                  onChange={(v) =>
                    c.patch(c.current!._id, {
                      links: { repo: c.current!.links?.repo ?? "", live: v },
                    })
                  }
                />
              </div>
              <UploadField
                label="Cover image"
                value={c.current.coverImage}
                onChange={(v) => c.patch(c.current!._id, { coverImage: v })}
                folder="portfolio/projects"
              />
              <div className="flex flex-wrap items-center gap-6">
                <Toggle
                  label="Published"
                  checked={c.current.published}
                  onChange={(v) => c.patch(c.current!._id, { published: v })}
                />
                {/* "Featured" lives on the star in the list rather than here:
                    two controls for one field, one auto-saving and one not,
                    is a reliable way to lose a change. */}
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  <Star
                    size={12}
                    aria-hidden="true"
                    className={c.current.featured ? "text-signal" : "text-ink-muted/40"}
                    fill={c.current.featured ? "currentColor" : "none"}
                  />
                  {c.current.featured
                    ? "Starred — on the home rail"
                    : "Not starred — archive only"}
                  <span className="normal-case tracking-normal text-ink-muted/60">
                    (use the star in the list)
                  </span>
                </p>
              </div>
            </Panel>

            <Panel title="Article — content blocks">
              <BlockBuilder
                blocks={c.current.blocks}
                onChange={(v) => c.patch(c.current!._id, { blocks: v })}
              />
            </Panel>

            <SaveBar state={c.state} error={c.error} onSave={() => c.save(c.current!)}>
              <DeleteButton what={c.current.name} onDelete={() => c.remove(c.current!._id)} />
            </SaveBar>
          </>
        ) : null}
      </CollectionLayout>
    </div>
  );
}
