import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/auth/google";
import {
  randomToken,
  setOAuthStateCookie,
  setOAuthNextCookie,
  safeAdminPath,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Kicks off the Google sign-in redirect. */
export async function GET(req: Request) {
  try {
    const state = randomToken(16);
    await setOAuthStateCookie(state);

    // Where to land afterwards. Validated here rather than at the callback so
    // an unacceptable value never reaches a cookie in the first place.
    const next = safeAdminPath(new URL(req.url).searchParams.get("next"));
    if (next) await setOAuthNextCookie(next);
    return NextResponse.redirect(buildAuthUrl(state));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign-in unavailable";
    return NextResponse.redirect(
      new URL(
        `/admin/signin?error=${encodeURIComponent(message)}`,
        process.env.APP_URL ?? "http://localhost:3000"
      )
    );
  }
}
