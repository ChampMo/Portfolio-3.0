import "./site.css";
import { getSiteData, pickFeatured } from "@/lib/data/queries";
import SiteChrome from "@/components/site/SiteChrome";
import ParallaxProvider from "@/components/site/ParallaxProvider";
import ReticleCursor from "@/components/site/ReticleCursor";
import Reveal from "@/components/site/Reveal";
import CommandPalette from "@/components/site/CommandPalette";
import Preloader from "@/components/site/Preloader";
import Hero from "@/components/site/Hero";
import About from "@/components/site/About";
import Marquee from "@/components/site/Marquee";
import TechForge from "@/components/site/TechForge";
import ServiceBay from "@/components/site/ServiceBay";
import ProjectRail from "@/components/site/ProjectRail";
import MissionLog from "@/components/site/MissionLog";
import Contact from "@/components/site/Contact";

// Content is edited in /admin, so the page must reflect the database on each
// request rather than a build-time snapshot.
export const dynamic = "force-dynamic";

/** De-duplicates case-insensitively while keeping the first spelling seen. */
function unique(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, v);
  }
  return [...seen.values()];
}

export default async function Home() {
  const { identity, skills, services, projects, experience } = await getSiteData();

  const initials =
    `${identity?.profile.firstName?.[0] ?? "M"}${identity?.profile.lastName?.[0] ?? "S"}`.toUpperCase();

  // Split the tech vocabulary across the two counter-scrolling marquee rows.
  const allTech = (skills?.categories ?? []).flatMap((c) => c.items);
  const half = Math.ceil(allTech.length / 2);

  return (
    <>
      <Preloader />
      <SiteChrome initials={initials} />
      <ParallaxProvider />
      <ReticleCursor />
      <Reveal />
      <CommandPalette />

      <Hero identity={identity} />

      <div className="page-body">
        <main>
          <About identity={identity} />
          <Marquee primary={allTech.slice(0, half)} secondary={allTech.slice(half)} />
          <TechForge skills={skills} identity={identity} />
          <ServiceBay
            services={services}
            identity={identity}
            projects={projects.map((p) => ({ _id: p._id, name: p.name, slug: p.slug }))}
          />
          {/* Service Bay still links against every project; only the rail is
              narrowed to the starred ones. The filter vocabulary is drawn from
              the whole archive so a chip never leads to an empty result. */}
          <ProjectRail
            projects={pickFeatured(projects)}
            total={projects.length}
            facets={{
              tag: unique(projects.flatMap((p) => p.tags)),
              stack: unique(projects.flatMap((p) => p.stack)),
              status: unique(projects.map((p) => p.status)),
            }}
          />
          <MissionLog experience={experience} identity={identity} />
          <Contact identity={identity} />
        </main>

        <footer className="flex flex-wrap justify-between gap-4 border-t border-grid px-[var(--pad-x)] py-7 font-mono text-[10px] tracking-[0.12em] text-ink-muted">
          <span>
            {(identity?.profile.firstName ?? "MONTHOL").toUpperCase()}{" "}
            {(identity?.profile.lastName ?? "SUKJINDA").toUpperCase()} &mdash; SIGNAL DECK
          </span>
          <span className="tabular-nums">
            {identity?.contact.address || "BKK / TH"} &middot;{" "}
            {identity?.contact.latitude ?? "13.7563"}&deg;N{" "}
            {identity?.contact.longitude ?? "100.5018"}&deg;E
          </span>
        </footer>
      </div>
    </>
  );
}
