"use client";

import type { ResumeDoc } from "@/models/Resume";
import type { IdentityDoc } from "@/models/Identity";
import type { SkillCategory } from "@/models/Skill";
import type { ServiceDoc } from "@/models/Service";

/**
 * The printed CV itself — the same markup for the on-screen preview and for
 * the page that leaves the browser as a PDF.
 *
 * One component on purpose. A separate print template is a template that
 * drifts, and the whole value of the preview is that it answers "does this fit
 * on one page" truthfully. What is measured here is what is printed.
 *
 * Sized in millimetres against A4 so the preview's proportions, and the fill
 * gauge built on them, mean something. `.cv-sheet` in globals.css supplies the
 * page box; everything here is content.
 */
export default function ResumeSheet({
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
  const p = identity?.profile;
  const name = [p?.firstName, p?.lastName].filter(Boolean).join(" ") || "Your name";
  const edu = identity?.education;

  /**
   * `https://` is noise on paper — nobody types it and it costs width on a
   * line that is already fighting for room.
   */
  const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  const contact = [
    identity?.contact?.address,
    identity?.contact?.email,
    identity?.contact?.phone,
    resume.website ? bare(resume.website) : "",
  ].filter(Boolean);

  const socials = Object.values(identity?.socials ?? {}).filter(
    (v): v is string => typeof v === "string" && v.trim() !== ""
  );

  const on = (key: string) => resume.sections.find((s) => s.key === key)?.enabled;
  const ordered = resume.sections.filter((s) => s.enabled);

  const entries = (which: "experience" | "projects") =>
    resume[which].filter((e) => e.enabled && (e.title || e.bullets.length));

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="cv-section">
        <h2 className="cv-h2">{title}</h2>
        {children}
      </section>
    );
  }

  function Entries({ which }: { which: "experience" | "projects" }) {
    const rows = entries(which);
    if (rows.length === 0) {
      return <p className="cv-empty">Nothing added yet.</p>;
    }
    return (
      <>
        {rows.map((e, i) => (
          <article key={i} className="cv-entry">
            <div className="cv-entry-head">
              <p className="cv-entry-title">
                <strong>{e.title}</strong>
                {e.subtitle ? <span className="cv-entry-sub">, {e.subtitle}</span> : null}
              </p>
              {e.time ? <p className="cv-entry-time">{e.time}</p> : null}
            </div>
            {e.bullets.length > 0 ? (
              <ul className="cv-bullets">
                {e.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </>
    );
  }

  return (
    <article className="cv-body">
      <header className="cv-head">
        <h1 className="cv-name">{name}</h1>
        {resume.headline || p?.role ? (
          <p className="cv-role">{resume.headline || p?.role}</p>
        ) : null}
        {contact.length > 0 ? <p className="cv-contact">{contact.join(" | ")}</p> : null}
        {socials.length > 0 ? <p className="cv-contact">{socials.join(" | ")}</p> : null}
      </header>

      {ordered.map((s) => {
        if (s.key === "education") {
          if (!edu?.universityName && !edu?.major) return null;
          return (
            <Section key={s.key} title="Education">
              <div className="cv-entry-head">
                <p className="cv-entry-title">
                  <strong>{edu?.universityName}</strong>
                  {edu?.major ? <span className="cv-entry-sub">, {edu.major}</span> : null}
                </p>
                {edu?.timelineStart || edu?.timelineEnd ? (
                  <p className="cv-entry-time">
                    {[edu?.timelineStart, edu?.timelineEnd].filter(Boolean).join(" – ")}
                  </p>
                ) : null}
              </div>
              {edu?.gpax || edu?.honours ? (
                <ul className="cv-bullets">
                  <li>{[edu?.gpax ? `GPAX ${edu.gpax}` : "", edu?.honours].filter(Boolean).join(" · ")}</li>
                </ul>
              ) : null}
            </Section>
          );
        }

        if (s.key === "experience") {
          return (
            <Section key={s.key} title="Experience">
              <Entries which="experience" />
            </Section>
          );
        }

        if (s.key === "projects") {
          return (
            <Section key={s.key} title="Projects">
              <Entries which="projects" />
            </Section>
          );
        }

        if (s.key === "skills") {
          const rows = skills.filter((c) => c.items.length > 0);
          if (rows.length === 0) return null;
          return (
            <Section key={s.key} title="Skills">
              {rows.map((c) => (
                <p key={c.name} className="cv-skill-row">
                  <strong>{c.name}:</strong> {c.items.join(", ")}
                </p>
              ))}
            </Section>
          );
        }

        if (s.key === "services" && on("services")) {
          const rows = services.filter((v) => v.published !== false && v.name);
          if (rows.length === 0) return null;
          return (
            <Section key={s.key} title="Services">
              <p className="cv-skill-row">{rows.map((v) => v.name).join(" · ")}</p>
            </Section>
          );
        }

        return null;
      })}
    </article>
  );
}
