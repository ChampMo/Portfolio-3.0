import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import AdminUser from "@/models/AdminUser";
import { readSessionPayload } from "./session";
import { isEmailAllowed } from "./allowlist";

export type AdminIdentity = {
  email: string;
  name: string;
  picture: string;
};

/**
 * Resolves the current admin, or null. Three gates must all pass:
 *   1. a valid, unexpired, correctly signed session cookie
 *   2. the email is still on the env allowlist (revocation takes effect
 *      immediately, without waiting for the cookie to expire)
 *   3. the cookie's version still matches the stored sessionVersion
 */
export async function getAdmin(): Promise<AdminIdentity | null> {
  const payload = await readSessionPayload();
  if (!payload) return null;

  if (!isEmailAllowed(payload.email)) return null;

  await connectToDatabase();
  const user = await AdminUser.findOne({ email: payload.email }).lean();
  if (!user) return null;
  if (user.sessionVersion !== payload.v) return null;

  return { email: user.email, name: user.name, picture: user.picture };
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getAdmin()) !== null;
}

/**
 * Guard for route handlers. Returns a 401 response to return early, or the
 * admin identity to continue with.
 *
 *   const gate = await requireAdmin();
 *   if (gate instanceof NextResponse) return gate;
 */
export async function requireAdmin(): Promise<NextResponse | AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Not authorised" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  return admin;
}
