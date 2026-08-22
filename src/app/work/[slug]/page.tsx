import "../../site.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ProjectDoc } from "@/models/Project";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import {
  getProjectBySlug,
  getProjects,
  getIdentity,
  getProducts,
} from "@/lib/data/queries";
import Reveal from "@/components/site/Reveal";
import CommandPalette from "@/components/site/CommandPalette";
import ReticleCursor from "@/components/site/ReticleCursor";
import ParallaxProvider from "@/components/site/ParallaxProvider";
import SplitText from "@/components/site/SplitText";
import ProjectBlocks from "@/components/site/ProjectBlocks";
import ReadingProgress from "@/components/site/ReadingProgress";
import BackLink from "@/components/site/BackLink";
import ShareButton from "@/components/site/ShareButton";
import ThemeToggle from "@/components/ThemeToggle";
import { safeUrl } from "@/lib/content/url";
import ViewPing from "@/components/site/ViewPing";
import ShippedCallout from "@/components/site/ShippedCallout";
import RelatedProjects, { relatedTo } from "@/components/site/RelatedProjects";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  DEPLOYED: "text-telemetry border-telemetry/45",
  IN_ORBIT: "text-signal border-signal/45",
  ARCHIVED: "text-ink-muted border-grid",
};

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project not found" };

  const title = `${project.name} — Monthol Sukjinda`;
  const description = project.summary || project.description || undefined;
  const url = `/work/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProjectPage(props: {
  params: Promise<{ slug: string }>;
}) {
  // Next 16: params is a Promise.
  const { slug } = await props.params;
  const [project, all, identity, products] = await Promise.all([
    getProjectBySlug(slug),
    getProjects(),
    getIdentity(),
    getProducts(),
  ]);

  if (!project) notFound();

  // Neighbours for the footer pager — the archive is an ordered rail, so
  // "next" here means the next card along it, not chronology.
  const idx = all.findIndex((p) => p._id === project._id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const related = relatedTo(project, all);

  // The product this case study is about, if it was ever shipped as one.
  const shipped = products.find((p) => p.projectId === project._id) ?? null;

  const links = [
    { label: "Repository", href: safeUrl(project.links.repo) },
    { label: "Live site", href: safeUrl(project.links.live) },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  const specs: Array<[string, string]> = [
    ["Year", project.year || "—"],
    ["Role", project.role || "—"],
    ["Status", project.status.replace("_", " ")],
  ];

  return (
    <>
      <ReticleCursor />
      <ParallaxProvider />
      <Reveal />
      <CommandPalette />
      <ViewPing id={project._id} />
      <ReadingProgress />

      <div className="min-h-svh bg-ground">
        <header className="sticky top-0 z-50 border-b border-grid bg-ground/85 backdrop-blur-[10px]">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[var(--pad-x)] py-5">
            <BackLink fallbackHref="/work" fallbackLabel="Back to archives" />
            <div className="flex min-w-0 items-center gap-4">
              <span className="hidden truncate font-mono text-[11px] tracking-[0.12em] text-telemetry sm:block">
                {project.codename || project.name.toUpperCase()}
              </span>
              <ShareButton title={project.name} />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* ── masthead ── */}
        <section className="relative overflow-hidden border-b border-grid">
          {/* Same grid backdrop the home sections use, so the detail page reads
              as part of the same system rather than a bare article. */}
          <div className="grid-bg !inset-0 opacity-40" data-px="0.05" aria-hidden="true" />

          <div className="relative z-[1] mx-auto max-w-[1240px] px-[var(--pad-x)] pb-16 pt-14">
            <div className="grid items-center gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.85fr)]">
            <div className="min-w-0">
            <div
              className="mb-6 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-ink-muted"
              data-reveal
            >
              {project.year ? <span className="tabular-nums">{project.year}</span> : null}
              {project.role ? (
                <>
                  <span aria-hidden="true" className="h-px w-4 bg-grid" />
                  <span className="uppercase">{project.role}</span>
                </>
              ) : null}
              <span
                className={`rounded-full border px-2.5 py-1 ${
                  STATUS_STYLE[project.status] ?? STATUS_STYLE.ARCHIVED
                }`}
              >
                {project.status.replace("_", " ")}
              </span>
            </div>

            <SplitText
              as="h1"
              text={project.name}
              className="mb-7 block font-display text-[clamp(3rem,9vw,7rem)] uppercase leading-[0.86]"
            />

            {project.summary ? (
              <p
                className="max-w-[46ch] text-[18px] leading-[1.6] text-ink-muted"
                data-reveal
              >
                {project.summary}
              </p>
            ) : null}
            </div>

            {/* Cover sits beside the title rather than below it. Full-width it
                was taller than the viewport, so every visitor scrolled past a
                giant image before reaching a word of the write-up — and these
                covers are often logo art, which gains nothing from the size. */}
            {project.coverImage ? (
              <figure
                className="relative m-0 overflow-hidden rounded-[16px] border border-grid bg-panel"
                data-reveal
              >
                {/* No fixed ratio: the frame takes the picture's own.
                    A cover forced into 4:3 and cropped to fill lost whatever
                    did not fit, and covers are not one shape — a 1200×630
                    social card lost a third of its width, taking the first
                    letters of the name with it. Letting the image set the
                    height means nothing is ever cut, for any project. The cap
                    is only for a pathologically tall one, where `contain`
                    letterboxes rather than crops. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.coverImage}
                  alt=""
                  className="block max-h-[68svh] w-full object-contain"
                />
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 border-l border-t border-ink/40" />
                <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-4 border-r border-t border-ink/40" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 size-4 border-b border-l border-ink/40" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 size-4 border-b border-r border-ink/40" />
              </figure>
            ) : null}
            </div>
          </div>
        </section>

        {/* ── body ── */}
        <section className="mx-auto max-w-[1240px] px-[var(--pad-x)] py-16">
          <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
            {/* main column */}
            <div className="min-w-0">
              {project.description ? (
                <p
                  className="mb-10 max-w-[64ch] whitespace-pre-line text-[17px] leading-[1.85] text-ink-muted"
                  data-reveal
                >
                  {project.description}
                </p>
              ) : null}

              {project.highlights.length > 0 ? (
                <div className="mb-12" data-reveal>
                  <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                    Highlights
                  </p>
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {project.highlights.map((h) => (
                      <li
                        key={h}
                        className="relative max-w-[62ch] pl-5 text-[15px] leading-relaxed text-ink-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-[0.7em] h-px w-2.5 bg-signal"
                        />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <ProjectBlocks blocks={project.blocks} />
            </div>

            {/* spec rail — mirrors the About spec sheet so the two pages share
                one visual vocabulary */}
            <aside className="lg:sticky lg:top-24 lg:self-start" data-reveal>
              <div className="overflow-hidden rounded-card border border-grid bg-panel">
                <div className="flex items-center justify-between border-b border-grid px-[18px] py-3 font-mono text-[10px] tracking-[0.16em] text-ink-muted">
                  <span className="inline-flex items-center gap-2">
                    <span className="status-dot" aria-hidden="true" />
                    SPEC
                  </span>
                  <span className="tabular-nums">
                    {String(idx >= 0 ? idx + 1 : 1).padStart(2, "0")} /{" "}
                    {String(all.length || 1).padStart(2, "0")}
                  </span>
                </div>

                {specs.map(([k, v]) => (
                  <div
                    key={k}
                    className="group relative flex items-center justify-between gap-4 border-b border-grid px-[18px] py-[13px] text-sm transition-colors hover:bg-panel-2"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-[2px] origin-center scale-y-0 bg-signal transition-transform duration-300 group-hover:scale-y-100"
                    />
                    <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                      {k}
                    </span>
                    <span className="text-right tabular-nums">{v}</span>
                  </div>
                ))}

                {project.stack.length > 0 ? (
                  <div className="px-[18px] py-4">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                      Stack
                    </p>
                    <div className="flex flex-wrap gap-[7px]">
                      {project.stack.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-grid px-2.5 py-[5px] font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {shipped ? <ShippedCallout product={shipped} /> : null}

              {links.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  {links.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cursor="OPEN"
                      className="group inline-flex items-center justify-between gap-2 rounded-full border border-grid px-5 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
                    >
                      {l.label}
                      <ExternalLink
                        size={12}
                        aria-hidden="true"
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </aside>
          </div>
        </section>

        <RelatedProjects projects={related} />

        {/* ── pager ── */}
        {prev || next ? (
          <nav
            aria-label="Other projects"
            className="mx-auto max-w-[1240px] px-[var(--pad-x)] pb-24"
          >
            <div className="grid gap-3 border-t border-grid pt-8 sm:grid-cols-2">
              {prev?.slug ? (
                <PagerCard project={prev} direction="prev" />
              ) : (
                <span aria-hidden="true" />
              )}
              {next?.slug ? <PagerCard project={next} direction="next" /> : null}
            </div>
          </nav>
        ) : null}

        <footer className="flex flex-wrap justify-between gap-4 border-t border-grid px-[var(--pad-x)] py-7 font-mono text-[10px] tracking-[0.12em] text-ink-muted">
          <span>
            {(identity?.profile.firstName ?? "MONTHOL").toUpperCase()}{" "}
            {(identity?.profile.lastName ?? "SUKJINDA").toUpperCase()} &mdash; SIGNAL DECK
          </span>
          <Link href="/" data-cursor="HOME" className="transition-colors hover:text-signal">
            Home &rarr;
          </Link>
        </footer>
      </div>
    </>
  );
}

/**
 * One half of the pager.
 *
 * The cover is laid in on the side away from the text, in two layers. A
 * blown-up blurred copy supplies the project's colour as atmosphere, and a
 * small sharp plate on top keeps it recognisable — most covers here are
 * square logo art, and cropping one straight into a wide strip reads as a
 * mistake rather than a design. Both are masked so the image dissolves before
 * it reaches the title instead of stopping at a hard edge.
 */
function PagerCard({
  project,
  direction,
}: {
  project: ProjectDoc;
  direction: "prev" | "next";
}) {
  const isNext = direction === "next";

  return (
    <Link
      href={`/work/${project.slug}`}
      data-cursor={isNext ? "NEXT" : "PREV"}
      className={`pager group relative flex min-h-[136px] flex-col justify-center overflow-hidden rounded-card border border-grid bg-panel p-6 transition-colors hover:border-signal ${
        isNext ? "items-end text-right sm:col-start-2" : "items-start"
      }`}
    >
      {project.coverImage ? (
        <span
          aria-hidden="true"
          className={`pager-art ${isNext ? "is-left" : "is-right"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.coverImage} alt="" className="pager-wash" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.coverImage} alt="" className="pager-plate" />
        </span>
      ) : null}

      <span className="relative z-[1] mb-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
        {isNext ? null : (
          <ArrowLeft
            size={12}
            aria-hidden="true"
            className="transition-transform group-hover:-translate-x-1"
          />
        )}
        {isNext ? "Next" : "Previous"}
        {isNext ? (
          <ArrowRight
            size={12}
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-1"
          />
        ) : null}
      </span>

      <span className="relative z-[1] block font-display text-[1.9rem] uppercase leading-[0.95]">
        {project.name}
      </span>
    </Link>
  );
}
