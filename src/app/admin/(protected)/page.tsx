import Link from "next/link";
import {
  EyeOff,
  Eye,
  Mail,
  Package,
  Wrench,
  FolderGit2,
  Briefcase,
  ArrowUpRight,
} from "lucide-react";
import { connectToDatabase } from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Service from "@/models/Service";
import Experience from "@/models/Experience";
import Product from "@/models/Product";
import Message from "@/models/Message";
import Identity from "@/models/Identity";
import { PageHead, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type TopProject = { name: string; slug: string; views: number };
type RecentMessage = { id: string; name: string; subject: string; read: boolean; at: string };

async function getOverview() {
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
      products,
      productDrafts,
      unread,
      messages,
      identity,
      viewAgg,
      topProjects,
      recent,
    ] = await Promise.all([
      Project.countDocuments({}),
      Project.countDocuments({ published: false }),
      Service.countDocuments({}),
      Service.countDocuments({ published: false }),
      Experience.countDocuments({}),
      Experience.countDocuments({ published: false }),
      Product.countDocuments({}),
      Product.countDocuments({ published: false }),
      Message.countDocuments({ read: false }),
      Message.countDocuments({}),
      Identity.findOne({ key: "main" }).lean(),
      Project.aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: "$views" } } },
      ]),
      Project.find({}).select("name slug views").sort({ views: -1 }).limit(5).lean(),
      Message.find({})
        .select("name subject read createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const raw = recent as unknown as Array<{
      _id: unknown;
      name?: string;
      subject?: string;
      read?: boolean;
      createdAt?: Date;
    }>;

    return {
      projects,
      projectDrafts,
      services,
      serviceDrafts,
      experience,
      experienceDrafts,
      products,
      productDrafts,
      unread,
      messages,
      hasIdentity: !!identity,
      views: viewAgg[0]?.total ?? 0,
      topProjects: (topProjects as unknown as TopProject[]).filter((p) => p.views > 0),
      recent: raw.map(
        (m): RecentMessage => ({
          id: String(m._id),
          name: m.name ?? "",
          subject: m.subject ?? "",
          read: m.read !== false,
          at: m.createdAt ? new Date(m.createdAt).toISOString() : "",
        })
      ),
      error: null as string | null,
    };
  } catch (err) {
    return {
      projects: 0,
      projectDrafts: 0,
      services: 0,
      serviceDrafts: 0,
      experience: 0,
      experienceDrafts: 0,
      products: 0,
      productDrafts: 0,
      unread: 0,
      messages: 0,
      hasIdentity: false,
      views: 0,
      topProjects: [] as TopProject[],
      recent: [] as RecentMessage[],
      error: err instanceof Error ? err.message : "Database unavailable",
    };
  }
}

/** "3d ago" answers "does this need me?" in a way a timestamp does not. */
function ago(iso: string): string {
  if (!iso) return "";
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 2592000) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default async function AdminOverview() {
  const c = await getOverview();

  const tiles = [
    {
      label: "Projects",
      value: c.projects,
      drafts: c.projectDrafts,
      sub: "archive entries",
      href: "/admin/projects",
      Icon: FolderGit2,
    },
    {
      label: "Products",
      value: c.products,
      drafts: c.productDrafts,
      sub: "deployment bay",
      href: "/admin/products",
      Icon: Package,
    },
    {
      label: "Services",
      value: c.services,
      drafts: c.serviceDrafts,
      sub: "patch bay channels",
      href: "/admin/services",
      Icon: Wrench,
    },
    {
      label: "Experience",
      value: c.experience,
      drafts: c.experienceDrafts,
      sub: "log entries",
      href: "/admin/experience",
      Icon: Briefcase,
    },
  ];

  const totalDrafts =
    c.projectDrafts + c.productDrafts + c.serviceDrafts + c.experienceDrafts;

  return (
    <div>
      {/* The shared head, as on every other page in here. This one used to
          hand-roll its own, which is why its eyebrow sat flush against the top
          of the scroller while the rest of the admin had room above theirs. */}
      <PageHead index="00" title="Overview" lead="Content status" />

      {c.error ? (
        <p
          role="alert"
          className="mb-8 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-danger"
        >
          Could not reach the database: {c.error}
        </p>
      ) : null}

      {/* ── how much of each thing exists ── */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="group rounded-[14px] border border-grid bg-panel p-5 transition-colors hover:border-signal"
          >
            <p className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              {t.label}
              <t.Icon
                size={13}
                aria-hidden="true"
                className="text-ink-muted/50 transition-colors group-hover:text-signal"
              />
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

      {/* ── the two numbers that might need acting on today ── */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/messages"
          className="group flex items-center justify-between gap-4 rounded-[14px] border border-grid bg-panel px-5 py-4 transition-colors hover:border-signal"
        >
          <span className="flex items-center gap-3">
            <Mail
              size={15}
              aria-hidden="true"
              className={c.unread > 0 ? "text-signal" : "text-ink-muted/50"}
            />
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                Inbox
              </span>
              <span className="block font-mono text-[11px] text-ink">
                {c.unread > 0 ? (
                  <span className="text-signal">{c.unread} unread</span>
                ) : (
                  "All read"
                )}
                <span className="text-ink-muted"> · {c.messages} total</span>
              </span>
            </span>
          </span>
          <ArrowUpRight
            size={14}
            aria-hidden="true"
            className="shrink-0 text-ink-muted/40 transition-colors group-hover:text-signal"
          />
        </Link>

        <div className="flex items-center justify-between gap-4 rounded-[14px] border border-grid bg-panel px-5 py-4">
          <span className="flex items-center gap-3">
            <Eye size={15} aria-hidden="true" className="text-ink-muted/50" />
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                Archive views
              </span>
              <span className="block font-mono text-[11px] tabular-nums text-ink">
                {c.views.toLocaleString()}
                <span className="text-ink-muted"> across all projects</span>
              </span>
            </span>
          </span>
          {totalDrafts > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warn/50 bg-warn/10 px-2 py-1 font-mono text-[10px] text-warn">
              <EyeOff size={9} aria-hidden="true" />
              {totalDrafts} hidden
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── what visitors actually open ── */}
        <Panel title="Most viewed">
          {c.topProjects.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-ink-muted">
              No views recorded yet. The counter ticks when someone opens a
              project&rsquo;s own page.
            </p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {c.topProjects.map((p, i) => (
                <li key={p.slug}>
                  <Link
                    href={`/work/${p.slug}`}
                    className="flex items-baseline gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-panel-2"
                  >
                    <span className="font-mono text-[10px] tabular-nums text-ink-muted/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
                    <span className="font-mono text-[11px] tabular-nums text-telemetry">
                      {p.views.toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {/* ── who has written in ── */}
        <Panel title="Latest messages">
          {c.recent.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-ink-muted">
              Nothing in the inbox yet.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {c.recent.map((m) => (
                <li key={m.id}>
                  <Link
                    href="/admin/messages"
                    className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-panel-2"
                  >
                    <span
                      aria-hidden="true"
                      title={m.read ? "Read" : "Unread"}
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        m.read ? "bg-grid" : "bg-signal"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {m.subject || "(no subject)"}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-ink-muted">
                        {m.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-muted/70">
                      {ago(m.at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {!c.hasIdentity && !c.error ? (
        <div className="mt-5 rounded-[14px] border border-warn/40 bg-warn/10 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-warn">
            No identity record yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            The public site needs a profile to render. Run{" "}
            <code className="font-mono text-ink">npm run seed</code> to import
            your existing content, or fill it in manually.
          </p>
          <Link
            href="/admin/identity"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-signal underline underline-offset-4"
          >
            Set up identity &rarr;
          </Link>
        </div>
      ) : null}
    </div>
  );
}
