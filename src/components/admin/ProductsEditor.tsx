"use client";

import { GitBranch, Plus, Trash2 } from "lucide-react";
import type { ProductDoc, ProductDownload } from "@/models/Product";
import type { LinkableProject } from "./ProjectLinker";
import {
  PRODUCT_PLATFORMS,
  PRODUCT_STATUSES,
  DEVICE_TYPES,
} from "@/lib/content/constants";
import { useCollection } from "@/lib/admin/useCollection";
import {
  PageHead,
  Panel,
  Field,
  TextArea,
  Select,
  Toggle,
  Button,
  SaveBar,
} from "./ui";
import CollectionLayout, { DeleteButton, DraftNotice } from "./CollectionLayout";
import UploadField from "./UploadField";
import GalleryEditor from "./GalleryEditor";
import ProjectImagePicker from "./ProjectImagePicker";
import BackdropEditor from "./BackdropEditor";

export default function ProductsEditor({
  initial,
  projects,
}: {
  initial: ProductDoc[];
  projects: LinkableProject[];
}) {
  const c = useCollection<ProductDoc>("products", initial);

  function patchDownload(i: number, changes: Partial<ProductDownload>) {
    const cur = c.current;
    if (!cur) return;
    c.patch(cur._id, {
      downloads: cur.downloads.map((d, j) => (j === i ? { ...d, ...changes } : d)),
    });
  }

  return (
    <div>
      <PageHead
        index="07"
        title="Deployment Bay"
        lead="Products"
        action={
          <Button
            variant="primary"
            onClick={() => c.create({ name: "New product", published: false })}
          >
            + Add product
          </Button>
        }
      />

      <CollectionLayout
        items={c.items}
        selected={c.selected}
        onSelect={c.setSelected}
        onReorder={c.reorder}
        label={(p) => p.name}
        emptyHint="No products yet. Anything added here appears in the Deployment Bay, reachable from the handle on the right of the hero."
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
                  label="Slug"
                  value={c.current.slug ?? ""}
                  onChange={(v) => c.patch(c.current!._id, { slug: v })}
                  hint="Leave blank to generate from the name"
                />
              </div>
              <Field
                label="Tagline"
                value={c.current.tagline}
                onChange={(v) => c.patch(c.current!._id, { tagline: v })}
                hint="One line — what it does, in the visitor's words"
              />
              <TextArea
                label="Description"
                value={c.current.description}
                onChange={(v) => c.patch(c.current!._id, { description: v })}
                rows={4}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Status"
                  value={c.current.status}
                  options={PRODUCT_STATUSES}
                  onChange={(v) =>
                    c.patch(c.current!._id, { status: v as ProductDoc["status"] })
                  }
                />
                <Select
                  label="Device frame"
                  value={c.current.deviceType}
                  options={DEVICE_TYPES}
                  onChange={(v) =>
                    c.patch(c.current!._id, { deviceType: v as ProductDoc["deviceType"] })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Platforms
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_PLATFORMS.map((p) => {
                    const on = c.current!.platforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          c.patch(c.current!._id, {
                            platforms: on
                              ? c.current!.platforms.filter((x) => x !== p)
                              : [...c.current!.platforms, p],
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                          on
                            ? "border-signal bg-signal text-on-signal"
                            : "border-grid text-ink-muted hover:border-ink-muted hover:text-ink"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Panel>

            <Panel title="Downloads">
              <Field
                label="GitHub repository"
                value={c.current.githubRepo}
                onChange={(v) => c.patch(c.current!._id, { githubRepo: v })}
                hint="owner/repo — e.g. ChampMo/OrbitKey. Set this and the version, file sizes, dates and every download link are read from the latest release automatically; publish a release and this page updates itself."
              />

              <p className="flex items-start gap-2.5 rounded-card border border-grid bg-ground px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-muted">
                <GitBranch size={14} className="mt-0.5 shrink-0 text-telemetry" aria-hidden="true" />
                With a repository set, the rows below are ignored. Use them only
                for anything GitHub does not serve — a Play Store listing, or a
                file hosted elsewhere.
              </p>

              <Field
                label="Version (fallback)"
                value={c.current.version}
                onChange={(v) => c.patch(c.current!._id, { version: v })}
                hint="Only used when there is no repository"
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                    Manual downloads
                  </span>
                  <Button
                    onClick={() =>
                      c.patch(c.current!._id, {
                        downloads: [
                          ...c.current!.downloads,
                          { platform: "WINDOWS", label: "", url: "", arch: "" },
                        ],
                      })
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <Plus size={12} aria-hidden="true" />
                      Add row
                    </span>
                  </Button>
                </div>

                {c.current.downloads.map((d, i) => (
                  <div
                    key={i}
                    className="grid gap-3 rounded-card border border-grid bg-ground p-3 sm:grid-cols-[7rem_8rem_minmax(0,1fr)_auto]"
                  >
                    <Select
                      label="Platform"
                      value={d.platform}
                      options={PRODUCT_PLATFORMS}
                      onChange={(v) =>
                        patchDownload(i, { platform: v as ProductDownload["platform"] })
                      }
                    />
                    <Field
                      label="Arch"
                      value={d.arch}
                      onChange={(v) => patchDownload(i, { arch: v })}
                    />
                    <Field
                      label="URL"
                      value={d.url}
                      onChange={(v) => patchDownload(i, { url: v })}
                    />
                    <div className="flex items-end pb-1">
                      <Button
                        variant="danger"
                        onClick={() =>
                          c.patch(c.current!._id, {
                            downloads: c.current!.downloads.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <TextArea
                  label="Install notes"
                  value={c.current.installNotes}
                  onChange={(v) => c.patch(c.current!._id, { installNotes: v })}
                  rows={3}
                />
                <p className="text-[11px] leading-relaxed text-ink-muted">
                  Shown under the download button — e.g. the macOS
                  &ldquo;xattr -cr&rdquo; workaround for the unidentified
                  developer warning.
                </p>
              </div>
            </Panel>

            <Panel title="Links & visibility">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Case study
                </span>
                <p className="text-[11px] leading-relaxed text-ink-muted">
                  Links this product to its write-up in the archive, so a
                  visitor can cross from &ldquo;use it&rdquo; to &ldquo;how it
                  was built&rdquo;.
                </p>
                <select
                  value={c.current.projectId}
                  onChange={(e) => c.patch(c.current!._id, { projectId: e.target.value })}
                  className="rounded-lg border border-grid bg-ground px-3.5 py-2.5 text-sm text-ink outline-none focus:border-signal"
                >
                  <option value="">— none —</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <Toggle
                label="Published"
                checked={c.current.published}
                onChange={(v) => c.patch(c.current!._id, { published: v })}
              />
            </Panel>

            <Panel title="Screen">
              <Field
                label="Live URL"
                value={c.current.liveUrl}
                onChange={(v) => c.patch(c.current!._id, { liveUrl: v })}
                hint="Opened by the primary button. Leave blank for a desktop-only app."
              />
              <Toggle
                label="Embed the live app in the device frame"
                checked={c.current.embedLive}
                onChange={(v) => c.patch(c.current!._id, { embedLive: v })}
              />
              <p className="text-[11px] leading-relaxed text-ink-muted">
                Only turn this on if the app allows being framed. If it refuses,
                the frame renders blank — the screenshots below are the safe
                default and are used whenever this is off.
              </p>

              <UploadField
                label="Icon"
                value={c.current.icon}
                onChange={(v) => c.patch(c.current!._id, { icon: v })}
                folder="portfolio/products"
              />
              <Field
                label="Demo video URL"
                value={c.current.demoVideo}
                onChange={(v) => c.patch(c.current!._id, { demoVideo: v })}
                hint="A YouTube link (watch, youtu.be or Shorts) or a direct .mp4 / .webm file. Plays muted on a loop in the device frame and takes priority over the stills."
              />
              <GalleryEditor
                label="Screenshots"
                images={c.current.screenshots}
                onChange={(v) => c.patch(c.current!._id, { screenshots: v })}
                folder="portfolio/products"
              />
              <ProjectImagePicker
                project={projects.find((p) => p._id === c.current!.projectId) ?? null}
                icon={c.current.icon}
                screenshots={c.current.screenshots}
                onIcon={(v) => c.patch(c.current!._id, { icon: v })}
                onScreenshots={(v) => c.patch(c.current!._id, { screenshots: v })}
              />
            </Panel>

            <Panel title="Backdrop">
              <BackdropEditor
                value={c.current.backdropHtml}
                opacity={c.current.backdropOpacity}
                onChange={(v) => c.patch(c.current!._id, { backdropHtml: v })}
                onOpacity={(v) => c.patch(c.current!._id, { backdropOpacity: v })}
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
