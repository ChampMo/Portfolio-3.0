"use client";

import type { ExperienceDoc } from "@/models/Experience";
import { EXPERIENCE_TYPES } from "@/lib/content/constants";
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
import TagPicker from "./TagPicker";

export default function ExperienceEditor({ initial }: { initial: ExperienceDoc[] }) {
  const c = useCollection<ExperienceDoc>("experience", initial);

  return (
    <div>
      <PageHead
        index="05"
        title="Mission Log"
        lead="Experience entries"
        action={
          <Button
            variant="primary"
            onClick={() => c.create({ role: "New entry", type: "WORK", published: false })}
          >
            + Add entry
          </Button>
        }
      />

      <CollectionLayout
        items={c.items}
        selected={c.selected}
        onSelect={c.setSelected}
        onReorder={c.reorder}
        label={(e) => e.role}
        emptyHint="No entries yet. Add one — the Mission Log section is hidden on the public site while this is empty."
      >
        {c.current ? (
          <>
            <DraftNotice published={c.current.published} />
            <Panel title="Entry">
              <Field
                label="Role"
                value={c.current.role}
                onChange={(v) => c.patch(c.current!._id, { role: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Organisation"
                  value={c.current.organization}
                  onChange={(v) => c.patch(c.current!._id, { organization: v })}
                />
                <Select
                  label="Type"
                  value={c.current.type}
                  options={EXPERIENCE_TYPES}
                  onChange={(v) =>
                    c.patch(c.current!._id, { type: v as ExperienceDoc["type"] })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Time"
                  value={c.current.time}
                  onChange={(v) => c.patch(c.current!._id, { time: v })}
                  hint='Free text — e.g. "2024 - Present"'
                />
                <Field
                  label="Location"
                  value={c.current.location}
                  onChange={(v) => c.patch(c.current!._id, { location: v })}
                />
              </div>
              <TextArea
                label="Summary"
                value={c.current.summary}
                onChange={(v) => c.patch(c.current!._id, { summary: v })}
                rows={3}
              />
            </Panel>

            <Panel title="Detail">
              <ListEditor
                label="Achievements"
                items={c.current.achievements}
                onChange={(v) => c.patch(c.current!._id, { achievements: v })}
                placeholder="e.g. Improved page load by 30%"
              />
              <TagPicker
                label="Stack"
                kind="tech"
                items={c.current.stack}
                onChange={(v) => c.patch(c.current!._id, { stack: v })}
                placeholder="e.g. Next.js"
              />
              <Toggle
                label="Published"
                checked={c.current.published}
                onChange={(v) => c.patch(c.current!._id, { published: v })}
              />
            </Panel>

            <SaveBar state={c.state} error={c.error} onSave={() => c.save(c.current!)}>
              <DeleteButton what={c.current.role} onDelete={() => c.remove(c.current!._id)} />
            </SaveBar>
          </>
        ) : null}
      </CollectionLayout>
    </div>
  );
}
