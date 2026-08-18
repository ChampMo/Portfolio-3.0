import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Tag from "@/models/Tag";
import Project from "@/models/Project";
import Experience from "@/models/Experience";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, bad, boom, readJson, str } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

const KINDS = ["tag", "tech"] as const;
type Kind = (typeof KINDS)[number];

/**
 * How many content documents currently use each name.
 *
 * Counted in memory from two small collections rather than one query per tag —
 * the pool is a few dozen entries at most, and N round-trips to render a
 * picker would be the wrong trade.
 */
async function usageByName(): Promise<Map<string, number>> {
  const [projects, experience] = await Promise.all([
    Project.find({}).select("stack tags").lean(),
    Experience.find({}).select("stack").lean(),
  ]);

  const counts = new Map<string, number>();
  const bump = (v: unknown) => {
    if (typeof v !== "string") return;
    const key = v.trim().toLowerCase();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  for (const p of projects as Array<{ stack?: unknown[]; tags?: unknown[] }>) {
    (p.stack ?? []).forEach(bump);
    (p.tags ?? []).forEach(bump);
  }
  for (const e of experience as Array<{ stack?: unknown[] }>) {
    (e.stack ?? []).forEach(bump);
  }
  return counts;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const kindParam = new URL(req.url).searchParams.get("kind");
    // Narrowed to the literal union so the query type matches the schema.
    const kind = (KINDS as readonly string[]).includes(kindParam ?? "")
      ? (kindParam as Kind)
      : null;
    const filter = kind ? { kind } : {};

    const [docs, counts] = await Promise.all([
      Tag.find(filter).sort({ name: 1 }).lean(),
      usageByName(),
    ]);

    return ok(
      (docs as Array<{ _id: unknown; name?: string; kind?: string }>).map((d) => ({
        _id: String(d._id),
        name: d.name ?? "",
        kind: d.kind ?? "tech",
        usageCount: counts.get((d.name ?? "").toLowerCase()) ?? 0,
      }))
    );
  } catch (err) {
    return boom(err, "GET /api/tags");
  }
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await readJson<{ name?: unknown; kind?: unknown }>(req);
  const name = str(body?.name);
  const kindRaw = str(body?.kind) || "tech";
  const kind = (KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as Kind) : "tech";

  if (!name) return bad("A name is required");
  if (name.length > 60) return bad("That name is too long");

  try {
    await connectToDatabase();

    // Case-insensitive dedupe: "Next.js" and "next.js" are the same entry, so
    // ticking one should never create a near-duplicate in the pool.
    const existing = await Tag.findOne({
      kind,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();

    if (existing) {
      const e = existing as { _id: unknown; name?: string; kind?: string };
      return ok({ _id: String(e._id), name: e.name ?? "", kind: e.kind ?? kind, usageCount: 0 });
    }

    const created = await Tag.create({ name, kind });
    return ok(
      { _id: String(created._id), name: created.name, kind: created.kind, usageCount: 0 },
      201
    );
  } catch (err) {
    // Two editors adding the same name at once both clear the check above and
    // one loses at the index. That means the pool already holds what the caller
    // asked for, which is not a failure — hand back the winner, not a 500.
    if ((err as { code?: number })?.code === 11000) {
      const existing = await Tag.findOne({ kind, name })
        .collation({ locale: "en", strength: 2 })
        .lean();
      if (existing) {
        const e = existing as { _id: unknown; name?: string };
        return ok({ _id: String(e._id), name: e.name ?? name, kind, usageCount: 0 });
      }
    }
    return boom(err, "POST /api/tags");
  }
}
