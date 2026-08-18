import "../site.css";
import Link from "next/link";
import type { Metadata } from "next";
import { getSiteData, pickFeatured } from "@/lib/data/queries";
import PrintButton from "@/components/site/PrintButton";
import ThemeToggle from "@/components/ThemeToggle";
import { safeUrl, safeHref } from "@/lib/content/url";

export const dynamic = "force-dynamic";

const TITLE = "Résumé — Monthol Sukjinda";

export const metadata: Metadata = {
  title: TITLE,
  description: "One-page résumé, generated from the live portfolio content.",
  alternates: { canonical: "/resume" },
  openGraph: { type: "profile", url: "/resume", title: TITLE },
};

/**
 * Printable one-pager, built from the same database as the site.
 *
 * It cannot go stale: editing a job in the admin updates the résumé, so there
 * is no second copy in a Word file drifting away from the portfolio. Print
 * styles in site.css turn it black-on-white and drop every control, so
 * "Save as PDF" produces the deliverable.
 *
 * Typography here is deliberately quieter than the rest of the site. The
 * display face is condensed and built for poster sizes; a résumé is skimmed at
 * 13px, often on paper. So the display face appears exactly once — on the name
 * — and everything below it separates by weight, colour and space rather than
 * by size. Five type sizes across the whole page, not fifteen.
 */
export default async function ResumePage() {
  const { identity, skills, services, projects, experience } = await getSiteData();

  const name = `${identity?.profile.firstName ?? "Monthol"} ${
    identity?.profile.lastName ?? "Sukjinda"
  }`;
  const edu = identity?.education;

  const contacts = [
    identity?.contact.email,
    identity?.contact.phone,
    identity?.contact.address,
  ].filter(Boolean) as string[];

  const socials = Object.entries(identity?.socials ?? {})
    .map(([k, v]) => [k, safeUrl(v)] as [string, string])
    .filter(([, v]) => v);

  // The starred projects — already the ones chosen as strongest.
  const featured = pickFeatured(projects).slice(0, 4);

  return (
    <div className="resume min-h-svh bg-ground">
      <div className="no-print sticky top-0 z-50 border-b border-grid bg-ground/90 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            data-cursor="HOME"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-signal"
          >
            &larr; Back to deck
          </Link>
          <div className="flex items-center gap-3">
            {identity?.media.cvVisible && identity.media.cvUrl ? (
              <a
                href={safeUrl(identity.media.cvUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-grid px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
              >
                Original CV
              </a>
            ) : null}
            <PrintButton />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[860px] px-6 py-14 sm:px-10">
        {/* ── masthead ── */}
        <header className="mb-11">
          <h1 className="mb-4 font-display text-[clamp(2.4rem,6vw,3.6rem)] uppercase leading-[0.92] tracking-[-0.01em]">
            {name}
          </h1>

          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-ink-muted">
            {contacts.map((c, i) => (
              <span key={c} className="flex items-center gap-2.5">
                {i > 0 ? <Dot /> : null}
                {c}
              </span>
            ))}
            {socials.map(([k, v]) => (
              <span key={k} className="flex items-center gap-2.5">
                <Dot />
                <a href={v} className="capitalize text-telemetry hover:text-signal">
                  {k}
                </a>
              </span>
            ))}
          </p>
        </header>

        {/* ── education ── */}
        {edu?.universityName || edu?.major ? (
          <Section title="Education">
            <Entry
              title={edu.universityName || edu.universityShort}
              meta={[edu.major, identity?.contact.address]}
              date={
                edu.timelineStart
                  ? `${edu.timelineStart} — ${edu.timelineEnd || "Present"}`
                  : ""
              }
            >
              {edu.gpax ? (
                <p className="text-[13px] leading-[1.7] text-ink-muted">
                  GPAX <span className="font-semibold text-ink">{edu.gpax}</span>
                  {edu.honours ? ` · ${edu.honours}` : ""}
                </p>
              ) : null}
            </Entry>
          </Section>
        ) : null}

        {/* ── skills ── */}
        {(skills?.categories ?? []).length > 0 ? (
          <Section title="Skills">
            <dl className="m-0 grid gap-x-10 gap-y-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
              {skills!.categories.map((c) => (
                // `contents` so every row's label lines up on one shared
                // column instead of each pair forming its own little grid.
                <div key={c.name} className="contents">
                  <dt className="font-mono text-[10px] uppercase leading-[1.85] tracking-[0.12em] text-ink-muted">
                    {c.name}
                  </dt>
                  <dd className="m-0 mb-2 text-[13px] leading-[1.8] text-ink sm:mb-0">
                    {c.items.join(" · ")}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        ) : null}

        {/* ── experience ── */}
        {experience.length > 0 ? (
          <Section title="Experience">
            <div className="flex flex-col gap-7">
              {experience.map((x) => (
                <Entry
                  key={x._id}
                  title={x.role}
                  meta={[x.organization, x.location]}
                  date={x.time}
                >
                  {x.summary ? (
                    <p className="text-[13px] leading-[1.7] text-ink-muted">{x.summary}</p>
                  ) : null}
                  <Bullets items={x.achievements} />
                  <Stack items={x.stack} />
                </Entry>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── projects ── */}
        {featured.length > 0 ? (
          <Section title="Selected projects">
            <div className="flex flex-col gap-7">
              {featured.map((p) => (
                <Entry
                  key={p._id}
                  title={p.name}
                  meta={[p.role, p.status.replace("_", " ")]}
                  date={p.year}
                >
                  {p.summary ? (
                    <p className="text-[13px] leading-[1.7] text-ink-muted">{p.summary}</p>
                  ) : null}
                  {/* The same bullets the project page leads with — on a
                      résumé these are the part a reader actually scans. */}
                  <Bullets items={p.highlights} />
                  <Stack items={p.stack} link={safeUrl(p.links.live || p.links.repo)} />
                </Entry>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── services ── */}
        {services.length > 0 ? (
          <Section title="Services">
            <p className="text-[13px] leading-[1.8] text-ink-muted">
              {services.map((s) => s.name).join(" · ")}
            </p>
          </Section>
        ) : null}

        <p className="mt-14 border-t border-grid pt-5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-muted">
          Generated from the live portfolio &middot;{" "}
          {new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </main>
    </div>
  );
}

function Dot() {
  return <span aria-hidden="true" className="size-[3px] rounded-full bg-ink-muted/45" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-11">
      <h2 className="mb-5 border-b border-grid pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-signal">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * One dated entry. Title and date share a baseline with the date pinned right,
 * which is the shape every reader already expects from a résumé — deviating
 * from it costs legibility and buys nothing.
 */
function Entry({
  title,
  meta,
  date,
  children,
}: {
  title: string;
  meta: Array<string | undefined>;
  date?: string;
  children?: React.ReactNode;
}) {
  const line = meta.filter(Boolean).join(" · ");

  return (
    <div className="break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <h3 className="m-0 text-[15px] font-semibold leading-snug text-ink">{title}</h3>
        {date ? (
          <span className="shrink-0 font-mono text-[10.5px] tabular-nums tracking-[0.06em] text-ink-muted">
            {date}
          </span>
        ) : null}
      </div>
      {line ? (
        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-telemetry">
          {line}
        </p>
      ) : null}
      {children ? <div className="mt-2.5 flex flex-col gap-2">{children}</div> : null}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {items.map((a) => (
        <li key={a} className="relative pl-4 text-[13px] leading-[1.65] text-ink-muted">
          <span
            aria-hidden="true"
            className="absolute left-0 top-[0.62em] h-px w-2 bg-signal"
          />
          {a}
        </li>
      ))}
    </ul>
  );
}

function Stack({ items, link }: { items: string[]; link?: string }) {
  if ((!items || items.length === 0) && !link) return null;
  return (
    <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-ink-muted/75">
      {items.join(" · ")}
      {link ? (
        <>
          {items.length > 0 ? " · " : ""}
          <a href={safeHref(link)} className="normal-case text-telemetry hover:text-signal">
            {link.replace(/^https?:\/\//, "")}
          </a>
        </>
      ) : null}
    </p>
  );
}
