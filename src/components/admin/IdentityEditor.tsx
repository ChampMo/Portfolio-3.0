"use client";

import { useState } from "react";
import type { IdentityDoc } from "@/models/Identity";
import { useSave } from "@/lib/admin/useSave";
import { PageHead, Panel, Field, TextArea, Toggle, SaveBar } from "./ui";
import UploadField from "./UploadField";
import GalleryEditor from "./GalleryEditor";

type Draft = {
  profile: IdentityDoc["profile"];
  availability: IdentityDoc["availability"];
  contact: IdentityDoc["contact"];
  socials: IdentityDoc["socials"];
  education: IdentityDoc["education"];
  media: IdentityDoc["media"];
  sections: IdentityDoc["sections"];
};

const EMPTY: Draft = {
  profile: { firstName: "", lastName: "", nickname: "", role: "", motto: "", intro: "" },
  availability: { isOpen: true, label: "Open to work" },
  contact: {
    phone: "",
    email: "",
    address: "",
    latitude: "13.7563",
    longitude: "100.5018",
    timezone: "Asia/Bangkok",
  },
  socials: { github: "", linkedin: "", instagram: "", facebook: "" },
  education: {
    universityName: "",
    universityShort: "",
    universityLogo: "",
    major: "",
    timelineStart: "",
    timelineEnd: "",
    gpax: "",
    honours: "",
  },
  media: {
    avatar: "",
    slideshowImages: [],
    cvUrl: "",
    cvVisible: true,
    transcriptUrl: "",
    transcriptVisible: true,
  },
  sections: {
    about: { eyebrow: "Identity", lead: "", body: "" },
    skills: { eyebrow: "Tech Forge", lead: "", body: "" },
    services: { eyebrow: "Service Bay", lead: "", body: "" },
    projects: { eyebrow: "Mission Archives", lead: "", body: "" },
    experience: { eyebrow: "Mission Log", lead: "", body: "" },
    contact: { eyebrow: "Channel Open", lead: "", body: "" },
  },
};

const SECTION_KEYS = ["about", "skills", "services", "experience", "contact"] as const;

export default function IdentityEditor({ initial }: { initial: IdentityDoc | null }) {
  const [d, setD] = useState<Draft>(() => ({
    profile: { ...EMPTY.profile, ...initial?.profile },
    availability: { ...EMPTY.availability, ...initial?.availability },
    contact: { ...EMPTY.contact, ...initial?.contact },
    socials: { ...EMPTY.socials, ...initial?.socials },
    education: { ...EMPTY.education, ...initial?.education },
    media: { ...EMPTY.media, ...initial?.media },
    sections: { ...EMPTY.sections, ...initial?.sections },
  }));

  const { state, error, run } = useSave();

  function patch<K extends keyof Draft>(group: K, key: string, value: unknown) {
    setD((prev) => ({
      ...prev,
      [group]: { ...(prev[group] as object), [key]: value },
    }));
  }

  function patchSection(key: (typeof SECTION_KEYS)[number], field: string, value: string) {
    setD((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [key]: { ...prev.sections[key], [field]: value },
      },
    }));
  }

  return (
    <div>
      <PageHead index="01" title="Identity" lead="Who you are" />

      <Panel title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" value={d.profile.firstName} onChange={(v) => patch("profile", "firstName", v)} />
          <Field label="Last name" value={d.profile.lastName} onChange={(v) => patch("profile", "lastName", v)} />
          <Field label="Nickname" value={d.profile.nickname} onChange={(v) => patch("profile", "nickname", v)} />
          <Field label="Role" value={d.profile.role} onChange={(v) => patch("profile", "role", v)} hint="Shown under the hero name" />
        </div>
        <Field label="Motto" value={d.profile.motto} onChange={(v) => patch("profile", "motto", v)} hint="The line under your name in the hero" />
        <TextArea label="Intro" value={d.profile.intro} onChange={(v) => patch("profile", "intro", v)} rows={4} />
      </Panel>

      <Panel title="Availability">
        <Toggle
          label="Open to work"
          checked={d.availability.isOpen}
          onChange={(v) => patch("availability", "isOpen", v)}
          hint="Controls the pulsing status pill on the hero and contact sections"
        />
        <Field label="Status label" value={d.availability.label} onChange={(v) => patch("availability", "label", v)} />
      </Panel>

      <Panel title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={d.contact.email} onChange={(v) => patch("contact", "email", v)} type="email" />
          <Field label="Phone" value={d.contact.phone} onChange={(v) => patch("contact", "phone", v)} />
        </div>
        <Field label="Address" value={d.contact.address} onChange={(v) => patch("contact", "address", v)} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Latitude" value={d.contact.latitude} onChange={(v) => patch("contact", "latitude", v)} hint="Hero telemetry readout" />
          <Field label="Longitude" value={d.contact.longitude} onChange={(v) => patch("contact", "longitude", v)} />
          <Field label="Timezone" value={d.contact.timezone} onChange={(v) => patch("contact", "timezone", v)} hint="IANA name, drives the live clock" />
        </div>
      </Panel>

      <Panel title="Social links">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GitHub" value={d.socials.github} onChange={(v) => patch("socials", "github", v)} />
          <Field label="LinkedIn" value={d.socials.linkedin} onChange={(v) => patch("socials", "linkedin", v)} />
          <Field label="Instagram" value={d.socials.instagram} onChange={(v) => patch("socials", "instagram", v)} />
          <Field label="Facebook" value={d.socials.facebook} onChange={(v) => patch("socials", "facebook", v)} />
        </div>
      </Panel>

      <Panel title="Education">
        <Field label="University" value={d.education.universityName} onChange={(v) => patch("education", "universityName", v)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Short name" value={d.education.universityShort} onChange={(v) => patch("education", "universityShort", v)} hint="e.g. KMUTT" />
          <Field label="GPA" value={d.education.gpax} onChange={(v) => patch("education", "gpax", v)} />
        </div>
        <Field label="Major" value={d.education.major} onChange={(v) => patch("education", "major", v)} />
        <Field
          label="Honours"
          value={d.education.honours}
          onChange={(v) => patch("education", "honours", v)}
          hint='e.g. "Second Class Honours" — shown on the résumé page'
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From" value={d.education.timelineStart} onChange={(v) => patch("education", "timelineStart", v)} />
          <Field label="To" value={d.education.timelineEnd} onChange={(v) => patch("education", "timelineEnd", v)} hint='e.g. "Present"' />
        </div>
        <UploadField
          label="University logo"
          value={d.education.universityLogo}
          onChange={(v) => patch("education", "universityLogo", v)}
          folder="portfolio/education"
          hint="Shown beside the institute row on the spec sheet."
        />
      </Panel>

      <Panel title="Media &amp; documents">
        <div className="grid gap-4 lg:grid-cols-2">
        <UploadField
          label="Profile photo"
          value={d.media.avatar}
          onChange={(v) => patch("media", "avatar", v)}
          folder="portfolio/profile"
          hint="Shown in the hero, beside your name."
        />
        <UploadField
          label="Resume / CV"
          kind="document"
          value={d.media.cvUrl}
          onChange={(v) => patch("media", "cvUrl", v)}
          visible={d.media.cvVisible}
          onVisibleChange={(v) => patch("media", "cvVisible", v)}
          folder="portfolio/docs"
          hint="Toggle controls whether the download button appears on the site."
        />
        <UploadField
          label="Transcript"
          kind="document"
          value={d.media.transcriptUrl}
          onChange={(v) => patch("media", "transcriptUrl", v)}
          visible={d.media.transcriptVisible}
          onVisibleChange={(v) => patch("media", "transcriptVisible", v)}
          folder="portfolio/docs"
        />
        </div>
        <GalleryEditor
          label="Slideshow gallery — shown in the About section"
          images={d.media.slideshowImages}
          onChange={(v) => patch("media", "slideshowImages", v)}
          folder="portfolio/gallery"
        />
      </Panel>

      <Panel title="Section headings">
        <p className="text-[11px] leading-relaxed text-ink-muted">
          The small uppercase label and the large heading shown above each
          section on the public site.
        </p>
        {SECTION_KEYS.map((key) => (
          <div key={key} className="grid gap-3 border-t border-grid pt-4 first:border-t-0 first:pt-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
              {key}
            </span>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Eyebrow" value={d.sections[key].eyebrow} onChange={(v) => patchSection(key, "eyebrow", v)} />
              <Field label="Heading" value={d.sections[key].lead} onChange={(v) => patchSection(key, "lead", v)} />
            </div>
            <TextArea label="Body" value={d.sections[key].body} onChange={(v) => patchSection(key, "body", v)} rows={2} />
          </div>
        ))}
      </Panel>

      <SaveBar
        state={state}
        error={error}
        onSave={() => run("/api/identity", { method: "PUT", body: JSON.stringify(d) })}
      />
    </div>
  );
}
