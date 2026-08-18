import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Skill from "@/models/Skill";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, boom, readJson, bad, cleanList, str, num } from "@/lib/api/respond";
import { normalizeSkill } from "@/lib/data/normalize";

export const dynamic = "force-dynamic";

type CategoryInput = { name?: unknown; items?: unknown; order?: unknown };

export async function GET() {
  try {
    await connectToDatabase();
    const doc = await Skill.findOne({ key: "main" }).lean();
    return ok(normalizeSkill(doc ? JSON.parse(JSON.stringify(doc)) : null));
  } catch (err) {
    return boom(err, "GET /api/skills");
  }
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await readJson<{ categories?: CategoryInput[] }>(req);
  if (!body || !Array.isArray(body.categories)) {
    return bad("Expected { categories: [...] }");
  }

  const categories = body.categories
    .map((c, i) => ({
      name: str(c.name),
      items: cleanList(c.items),
      order: num(c.order, i),
    }))
    .filter((c) => c.name.length > 0)
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, order: i }));

  try {
    await connectToDatabase();
    const doc = await Skill.findOneAndUpdate(
      { key: "main" },
      { $set: { categories } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
    return ok(normalizeSkill(doc ? JSON.parse(JSON.stringify(doc)) : null));
  } catch (err) {
    return boom(err, "PUT /api/skills");
  }
}
