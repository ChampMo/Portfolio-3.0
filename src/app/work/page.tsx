import "../site.css";
import type { Metadata } from "next";
import { getProjects } from "@/lib/data/queries";
import Reveal from "@/components/site/Reveal";
import CommandPalette from "@/components/site/CommandPalette";
import ReticleCursor from "@/components/site/ReticleCursor";
import ParallaxProvider from "@/components/site/ParallaxProvider";
import SplitText from "@/components/site/SplitText";
import ArchiveDeck, { type ArchiveFilters } from "@/components/site/ArchiveDeck";
import BackLink from "@/components/site/BackLink";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

const TITLE = "Mission Archives — Monthol Sukjinda";
const DESCRIPTION = "Every project in the archive, filterable by tag, stack and status.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/work" },
  openGraph: { type: "website", url: "/work", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** `?tag=ai,frontend` → `["ai", "frontend"]`. */
function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function ArchivePage(props: {
  // Next 16: searchParams is a Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [projects, sp] = await Promise.all([getProjects(), props.searchParams]);

  // Read once on the server so a shared link opens already filtered; the deck
  // owns the state from then on.
  const initial: ArchiveFilters = {
    tag: list(sp.tag),
    stack: list(sp.stack),
    status: list(sp.status),
    q: typeof sp.q === "string" ? sp.q : "",
  };

  return (
    <>
      <ReticleCursor />
      <ParallaxProvider />
      <Reveal />
      <CommandPalette />

      <div className="min-h-svh bg-ground">
        <header className="sticky top-0 z-50 border-b border-grid bg-ground/85 backdrop-blur-[10px]">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[var(--pad-x)] py-5">
            {/* Stepping back rather than linking to "/" keeps the home page's
                scroll position, so the rail is where it was left. */}
            <BackLink fallbackHref="/" fallbackLabel="Back to deck" />
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] tabular-nums tracking-[0.12em] text-telemetry">
                {String(projects.length).padStart(2, "0")} RECORDS
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden border-b border-grid">
          <div className="grid-bg !inset-0 opacity-40" data-px="0.05" aria-hidden="true" />
          <div className="relative z-[1] mx-auto max-w-[1240px] px-[var(--pad-x)] pb-12 pt-14">
            <div
              className="mb-6 flex flex-wrap items-baseline gap-[18px] font-mono text-[11px] tracking-[0.18em] text-ink-muted"
              data-reveal
            >
              <span className="text-signal">04</span>
              <span className="uppercase">Mission Archives</span>
              <span aria-hidden="true" className="h-px min-w-10 flex-1 bg-grid" />
            </div>
            <SplitText
              as="h1"
              text="The full record"
              className="block font-display text-[clamp(2.6rem,8vw,6rem)] uppercase leading-[0.88]"
            />
          </div>
        </section>

        {projects.length === 0 ? (
          <p className="mx-auto max-w-[1240px] px-[var(--pad-x)] py-16 text-sm text-ink-muted">
            Nothing in the archive yet.
          </p>
        ) : (
          <ArchiveDeck projects={projects} initial={initial} />
        )}
      </div>
    </>
  );
}
