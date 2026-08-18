import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForProfile } from "@/lib/auth/google";
import {
  consumeOAuthStateCookie,
  consumeOAuthNextCookie,
  setSessionCookie,
  safeEqual,
} from "@/lib/auth/session";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { connectToDatabase } from "@/lib/db/mongodb";
import AdminUser from "@/models/AdminUser";
import { sendSignInAlert } from "@/lib/mail/mailer";

export const dynamic = "force-dynamic";

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function fail(reason: string) {
  return NextResponse.redirect(
    `${appUrl()}/admin/signin?error=${encodeURIComponent(reason)}`
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Both cookies are single-use: read and clear them whatever the outcome.
  const expectedState = await consumeOAuthStateCookie();
  const next = await consumeOAuthNextCookie();

  if (oauthError) return fail(oauthError);
  if (!code) return fail("Missing authorization code");
  if (!state || !expectedState || !safeEqual(state, expectedState)) {
    return fail("Invalid sign-in state. Please try again.");
  }

  let profile;
  try {
    profile = await exchangeCodeForProfile(code);
  } catch (err) {
    console.error("[auth] token exchange failed:", err);
    return fail("Could not verify your Google account.");
  }

  if (!profile.emailVerified) {
    return fail("Your Google email address is not verified.");
  }

  // Checked before any database write, so a rejected account leaves no trace.
  if (!isEmailAllowed(profile.email)) {
    console.warn(`[auth] denied sign-in for ${profile.email} (not on allowlist)`);
    return fail("This account does not have access.");
  }

  await connectToDatabase();
  const user = await AdminUser.findOneAndUpdate(
    { email: profile.email },
    {
      $set: {
        googleSub: profile.sub,
        name: profile.name,
        picture: profile.picture,
        lastLoginAt: new Date(),
      },
      $inc: { loginCount: 1 },
      $setOnInsert: { sessionVersion: 1 },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  await setSessionCookie(user.email, user.sessionVersion);

  // Best-effort notification; a mail outage must not block sign-in.
  sendSignInAlert(user.email, user.name).catch((err) =>
    console.error("[auth] sign-in alert failed:", err)
  );

  return NextResponse.redirect(`${appUrl()}${next ?? "/admin"}`);
}
