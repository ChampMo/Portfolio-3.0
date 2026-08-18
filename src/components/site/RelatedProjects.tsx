import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ProjectDoc } from "@/models/Project";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Projects sharing subject matter with this one.
 *
 * Tags weigh more than stack because they describe what the work *was*, while
 * a shared framework often means nothing — half the archive is Next.js. A
 * project with no overlap at all is not padded out with filler: an honest
 * empty section beats three unrelated cards labelled "related".
 */
export function relatedTo(project: ProjectDoc, all: ProjectDoc[], limit = 3): ProjectDoc[] {
  const tags = new Set(project.tags.map(norm));
  const stack = new Set(project.stack.map(norm));

  return all
    .filter((p) => p._id !== project._id && p.slug)
    .map((p) => ({
      p,
      score:
        p.tags.filter((t) => tags.has(norm(t))).length * 2 +
        p.stack.filter((t) => stack.has(norm(t))).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.order - b.p.order)
    .slice(0, limit)
    .map((x) => x.p);
}

export default function RelatedProjects({ projects }: { projects: ProjectDoc[] }) {
  if (projects.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1240px] px-[var(--pad-x)] pb-4">
      <div className="border-t border-grid pt-10">
        <p
          className="mb-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted"
          data-reveal
        >
          <span className="text-signal">{"//"}</span> Related records
        </p>

        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p._id} data-reveal>
              <Link
                href={`/work/${p.slug}`}
                data-cursor="VIEW"
                className="spot group flex h-full items-center gap-4 rounded-card border border-grid bg-panel p-4 transition-colors hover:border-signal"
              >
                {p.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImage}
                    alt=""
                    className="relative z-[1] size-14 shrink-0 rounded-[10px] border border-grid object-cover"
                  />
                ) : null}

                <span className="relative z-[1] flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-display text-[1.25rem] uppercase leading-none">
                    {p.name}
                  </span>
                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted">
                    {p.tags.slice(0, 2).join(" · ") || p.status.replace("_", " ")}
                  </span>
                </span>

                <ArrowUpRight
                  size={14}
                  aria-hidden="true"
                  className="relative z-[1] shrink-0 text-ink-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-signal"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
