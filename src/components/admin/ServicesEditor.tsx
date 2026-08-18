"use client";

import type { ServiceDoc } from "@/models/Service";
import { useCollection } from "@/lib/admin/useCollection";
import { PageHead, Panel, Field, TextArea, ListEditor, Toggle, Button, SaveBar } from "./ui";
import CollectionLayout, { DeleteButton, DraftNotice } from "./CollectionLayout";
import ProjectLinker, { type LinkableProject } from "./ProjectLinker";

export default function ServicesEditor({
  initial,
  projects,
}: {
  initial: ServiceDoc[];
  projects: LinkableProject[];
}) {
  const c = useCollection<ServiceDoc>("services", initial);

  return (
    <div>
      <PageHead
        index="03"
        title="Service Bay"
        lead="Patch bay channels"
        action={
          <Button
            variant="primary"
            onClick={() =>
              c.create({ name: "New service", code: "NEW", published: false })
            }
          >
            + Add channel
          </Button>
        }
      />

      <CollectionLayout
        items={c.items}
        selected={c.selected}
        onSelect={c.setSelected}
        onReorder={c.reorder}
        label={(s) => s.code || s.name}
        emptyHint="No services yet. Add a channel — the Service Bay section is hidden on the public site while this is empty."
      >
        {c.current ? (
          <>
            <DraftNotice published={c.current.published} />
            <Panel title="Channel">
              <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                <Field
                  label="Code"
                  value={c.current.code}
                  onChange={(v) => c.patch(c.current!._id, { code: v.toUpperCase() })}
                  hint="Selector label"
                />
                <Field
                  label="Name"
                  value={c.current.name}
                  onChange={(v) => c.patch(c.current!._id, { name: v })}
                />
              </div>
              <Field
                label="Tagline"
                value={c.current.tagline}
                onChange={(v) => c.patch(c.current!._id, { tagline: v })}
                hint="One line, shown in the signal colour"
              />
              <TextArea
                label="Description"
                value={c.current.description}
                onChange={(v) => c.patch(c.current!._id, { description: v })}
                rows={4}
              />
              <ListEditor
                label="Deliverables"
                items={c.current.deliverables}
                onChange={(v) => c.patch(c.current!._id, { deliverables: v })}
                placeholder="e.g. CI pipelines reporting test health"
              />
              <ProjectLinker
                projects={projects}
                selected={c.current.linkedProjectIds}
                onChange={(ids) => c.patch(c.current!._id, { linkedProjectIds: ids })}
              />
              <Toggle
                label="Published"
                checked={c.current.published}
                onChange={(v) => c.patch(c.current!._id, { published: v })}
                hint="Unpublished channels are hidden from the public site"
              />
            </Panel>

            <SaveBar
              state={c.state}
              error={c.error}
              onSave={() => c.save(c.current!)}
            >
              <DeleteButton
                what={c.current.name}
                onDelete={() => c.remove(c.current!._id)}
              />
            </SaveBar>
          </>
        ) : null}
      </CollectionLayout>
    </div>
  );
}
