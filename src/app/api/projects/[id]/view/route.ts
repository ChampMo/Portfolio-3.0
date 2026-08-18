import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import Project from "@/models/Project";
import { ok, bad, boom } from "@/lib/api/respond";
import { tooMany, clientIp } from "@/lib/api/throttle";

export const dynamic = "force-dynamic";

/**
 * Public counter — the only unauthenticated write on the site.
 *
 * Silently accepts and drops throttled requests rather than returning 429: the
 * caller is a fire-and-forget ping with nothing to report to, and a 429 would
 * only tell someone probing it exactly where the limit sits.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  // Next 16: params is a Promise.
  const { id } = await props.params;
  if (!mongoose.isValidObjectId(id)) return bad("Invalid id");

  // The client already refuses to count twice per session, but that guard is
  // one line of JavaScript an attacker simply does not run. Two limits: a
  // per-project one so a single visitor cannot inflate one number, and a
  // per-address one so nobody can walk the whole archive in a loop.
  const ip = clientIp(req);
  if (tooMany(`view:${ip}:${id}`, 3, 60 * 60 * 1000)) return ok({ ok: true });
  if (tooMany(`view:${ip}`, 60, 10 * 60 * 1000)) return ok({ ok: true });

  try {
    await connectToDatabase();
    await Project.updateOne({ _id: id }, { $inc: { views: 1 } });
    return ok({ ok: true });
  } catch (err) {
    return boom(err, "POST /api/projects/[id]/view");
  }
}
