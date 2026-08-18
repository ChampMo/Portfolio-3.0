import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import Message from "@/models/Message";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, bad, boom, readJson, bool } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

async function gateAndId(props: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return { res: gate };
  // Next 16: params is a Promise.
  const { id } = await props.params;
  if (!mongoose.isValidObjectId(id)) return { res: bad("Invalid id") };
  return { id };
}

/** Only `read` is mutable — the message itself is a record of what was sent. */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const g = await gateAndId(props);
  if (g.res) return g.res;

  const body = await readJson<{ read?: unknown }>(req);
  if (!body) return bad("Invalid JSON body");

  try {
    await connectToDatabase();
    const doc = await Message.findByIdAndUpdate(
      g.id,
      { $set: { read: bool(body.read, true) } },
      { returnDocument: "after" }
    ).lean();
    if (!doc) return bad("Message not found", 404);
    return ok(JSON.parse(JSON.stringify(doc)));
  } catch (err) {
    return boom(err, "PATCH /api/messages/[id]");
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const g = await gateAndId(props);
  if (g.res) return g.res;

  try {
    await connectToDatabase();
    const doc = await Message.findByIdAndDelete(g.id).lean();
    if (!doc) return bad("Message not found", 404);
    return ok({ ok: true });
  } catch (err) {
    return boom(err, "DELETE /api/messages/[id]");
  }
}
