import Link from "next/link";
import { EyeOff } from "lucide-react";
import { connectToDatabase } from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Service from "@/models/Service";
import Experience from "@/models/Experience";
import Identity from "@/models/Identity";

export const dynamic = "force-dynamic";

async function getCounts() {
  try {
    await connectToDatabase();
    // `published: false` (not `$ne: true`) counts only explicit drafts, which
    // is what the admin can actually act on.
    const [
      projects,
      projectDrafts,
      services,
      serviceDrafts,
      experience,
      experienceDrafts,
      identity,
    ] = await Promise.all([
      Project.countDocuments({}),
      Project.countDocuments({ published: false }),
      Service.countDocuments({}),
      Service.countDocuments({ published: false }),
      Experience.countDocuments({}),
      Experience.countDocuments({ published: false }),
      Identity.findOne({ key: "main" }).lean(),
    ]);
    return {
      projects,
      projectDrafts,
      services,
      serviceDrafts,
      experience,
      experienceDrafts,
      hasIdentity: !!identity,
      error: null,
    };
  } catch (err) {
    return {
      projects: 0,
      projectDrafts: 0,
      services: 0,
      serviceDrafts: 0,
      experience: 0,
      experienceDrafts: 0,
      hasIdentity: false,
      error: err instanceof Error ? err.message : "Database unavailable",
    };
  }
}

export default async function AdminOverview() {
  const c = await getCounts();

  const tiles = [
    { label: "Projects", value: c.projects, drafts: c.projectDrafts, sub: "archive entries", href: "/admin/projects" },
    { label: "Services", value: c.services, drafts: c.serviceDrafts, sub: "patch bay channels", href: "/admin/services" },
    { label: "Experience", value: c.experience, drafts: c.experienceDrafts, sub: "log entries", href: "/admin/experience" },
  ];

  return (
    <div>
      <header className="mb-10 flex items-baseline gap-4">
        <span className="font-mono text-[11px] tracking-[0.16em] text-signal">00</span>
        <h1 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-muted">
          Overview
        </h1>
        <span aria-hidden="true" className="h-px flex-1 bg-grid" />
      </header>

      <h2 className="mb-8 font-display text-[clamp(2rem,4vw,3rem)] leading-[0.95] uppercase">
        Content status
      </h2>

      {c.error ? (
        <p
          role="alert"
          className="mb-8 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-danger"
        >
          Could not reach the database: {c.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-[14px] border border-grid bg-panel p-6 transition-colors hover:border-signal"
          >
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-muted">
              {t.label}
            </p>
            <p className="mt-3 font-display text-[2.6rem] leading-none tabular-nums">
              {t.value}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-ink-muted">
              {t.sub}
              {t.drafts > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-warn/50 bg-warn/10 px-1.5 py-0.5 text-warn">
                  <EyeOff size={9} aria-hidden="true" />
                  {t.drafts} draft{t.drafts === 1 ? "" : "s"}
                </span>
              ) : null}
            </p>
          </Link>
        ))}
      </div>

      {!c.hasIdentity && !c.error ? (
        <div className="mt-8 rounded-[14px] border border-warn/40 bg-warn/10 p-6">
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-warn">
            No identity record yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            The public site needs a profile to render. Run{" "}
            <code className="font-mono text-ink">npm run seed</code> to import
            your existing content, or fill it in manually.
          </p>
          <Link
            href="/admin/identity"
            className="mt-4 inline-block font-mono text-[11px] tracking-[0.1em] uppercase text-signal underline underline-offset-4"
          >
            Set up identity &rarr;
          </Link>
        </div>
      ) : null}
    </div>
  );
}
