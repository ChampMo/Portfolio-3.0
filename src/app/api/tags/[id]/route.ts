import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import Tag from "@/models/Tag";
import Project from "@/models/Project";
import Experience from "@/models/Experience";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, bad, boom, readJson, str } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * Rename, cascading into every document that already uses the old name.
 *
 * Stack and tag values are stored as plain strings on each document, not as
 * references. Renaming only the pool entry would leave the existing content
 * pointing at a name that no longer exists in the picker — the pool and the
 * site would silently disagree. The positional `$[]` operator rewrites the
 * matching array entries in place.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return bad("Invalid id", 400);

  const body = await readJson<{ name?: unknown }>(req);
  const name = str(body?.name);
  if (!name) return bad("A name is required");
  if (name.length > 60) return bad("That name is too long");

  try {
    await connectToDatabase();

    const tag = await Tag.findById(id);
    if (!tag) return bad("Not found", 404);

    const oldName = tag.name;
    if (oldName === name) return ok({ _id: id, name, kind: tag.kind, renamed: 0 });

    const clash = await Tag.findOne({
      _id: { $ne: id },
      kind: tag.kind,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();
    if (clash) return bad("Another entry already uses that name.", 409);

    tag.name = name;
    await tag.save();

    const [p1, p2, e1] = await Promise.all([
      Project.updateMany({ stack: oldName }, { $set: { "stack.$[el]": name } }, {
        arrayFilters: [{ el: oldName }],
      }),
      Project.updateMany({ tags: oldName }, { $set: { "tags.$[el]": name } }, {
        arrayFilters: [{ el: oldName }],
      }),
      Experience.updateMany({ stack: oldName }, { $set: { "stack.$[el]": name } }, {
        arrayFilters: [{ el: oldName }],
      }),
    ]);

    return ok({
      _id: id,
      name,
      kind: tag.kind,
      renamed: (p1.modifiedCount ?? 0) + (p2.modifiedCount ?? 0) + (e1.modifiedCount ?? 0),
    });
  } catch (err) {
    return boom(err, `PUT /api/tags/${id}`);
  }
}

/**
 * Removes the entry from the pool only. Documents already using the name keep
 * it — deleting a shared vocabulary entry should never silently strip content
 * from published projects.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return bad("Invalid id", 400);

  try {
    await connectToDatabase();
    const deleted = await Tag.findByIdAndDelete(id).lean();
    if (!deleted) return bad("Not found", 404);
    return ok({ ok: true, id });
  } catch (err) {
    return boom(err, `DELETE /api/tags/${id}`);
  }
}
