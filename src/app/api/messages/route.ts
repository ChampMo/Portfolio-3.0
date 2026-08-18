import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Message from "@/models/Message";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, boom } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/** Admin-only: the public route writes here, but only the admin reads. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    await connectToDatabase();
    const docs = await Message.find({}).sort({ createdAt: -1 }).limit(300).lean();
    return ok(JSON.parse(JSON.stringify(docs)));
  } catch (err) {
    return boom(err, "GET /api/messages");
  }
}
