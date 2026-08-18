const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Add it to .env.local`);
  return v;
}

/** Must exactly match an Authorised redirect URI in the Google console. */
export function redirectUri(): string {
  const base = required("APP_URL").replace(/\/+$/, "");
  return `${base}/api/auth/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: required("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    // Always show the chooser so signing in with the wrong account is recoverable.
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges the authorization code, then reads the profile from the userinfo
 * endpoint. Both calls are server-to-server over TLS using the client secret,
 * so the response is trusted directly — no local JWT signature verification of
 * the id_token is needed (and none is attempted, which avoids a whole class of
 * "verified with alg:none" mistakes).
 */
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${detail}`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("Google token response had no access_token");

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });

  if (!userRes.ok) {
    throw new Error(`Google userinfo failed (${userRes.status})`);
  }

  const u = (await userRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!u.email) throw new Error("Google account returned no email address");

  return {
    sub: u.sub,
    email: u.email.toLowerCase(),
    emailVerified: u.email_verified === true,
    name: u.name ?? "",
    picture: u.picture ?? "",
  };
}
