import { NextResponse } from "next/server";
import { clearSessionCookie, readSessionPayload } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongodb";
import AdminUser from "@/models/AdminUser";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout            → clear this browser's cookie
 * POST /api/auth/logout?all=1      → also bump sessionVersion, invalidating
 *                                    every cookie issued to this account
 */
export async function POST(req: Request) {
  const everywhere = new URL(req.url).searchParams.get("all") === "1";
  const payload = await readSessionPayload();

  if (everywhere && payload) {
    await connectToDatabase();
    await AdminUser.updateOne({ email: payload.email }, { $inc: { sessionVersion: 1 } });
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
