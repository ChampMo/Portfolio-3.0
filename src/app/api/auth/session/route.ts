import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdmin();
  return NextResponse.json(
    admin
      ? { authenticated: true, admin }
      : { authenticated: false, admin: null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
