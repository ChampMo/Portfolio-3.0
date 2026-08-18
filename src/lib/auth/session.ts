import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

export const SESSION_COOKIE = "signal_session";
export const OAUTH_STATE_COOKIE = "signal_oauth_state";
export const OAUTH_NEXT_COOKIE = "signal_oauth_next";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

export type SessionPayload = {
  /** Google account email — the identity the allowlist is checked against. */
  email: string;
  /** Bumped on "sign out everywhere" to invalidate previously issued cookies. */
  v: number;
  /** Expiry, epoch ms. */
  exp: number;
};

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short (32+ chars required). " +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf as Buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return Buffer.from(t, "base64");
}

/** Constant-time string compare that never throws on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function signSession(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = b64url(createHmac("sha256", getSecret()).update(body).digest());
  if (!safeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.email !== "string" || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

// ───────────────────────── cookies ─────────────────────────

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSessionCookie(email: string, version: number) {
  const token = signSession({
    email,
    v: version,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { ...baseCookie, maxAge: SESSION_TTL_SECONDS });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...baseCookie, maxAge: 0 });
}

export async function readSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Short-lived cookie holding the OAuth `state` value for CSRF protection. */
export async function setOAuthStateCookie(state: string) {
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, { ...baseCookie, maxAge: 600 });
}

export async function consumeOAuthStateCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(OAUTH_STATE_COOKIE)?.value ?? null;
  store.set(OAUTH_STATE_COOKIE, "", { ...baseCookie, maxAge: 0 });
  return value;
}

/**
 * Only admin paths, and never a protocol-relative one.
 *
 * This value survives a round trip through Google and then becomes a redirect
 * target, so it is exactly the shape of thing that turns into an open redirect
 * if it is trusted. Anything that is not a literal in-app admin path is
 * discarded rather than repaired.
 */
export function safeAdminPath(input: unknown): string | null {
  const s = typeof input === "string" ? input.trim() : "";
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  return /^\/admin(?:\/[A-Za-z0-9\-_/]*)?$/.test(s) ? s : null;
}

/** Remembers where the visitor was heading when they were bounced to sign-in. */
export async function setOAuthNextCookie(path: string) {
  const store = await cookies();
  store.set(OAUTH_NEXT_COOKIE, path, { ...baseCookie, maxAge: 600 });
}

export async function consumeOAuthNextCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(OAUTH_NEXT_COOKIE)?.value ?? null;
  store.set(OAUTH_NEXT_COOKIE, "", { ...baseCookie, maxAge: 0 });
  return safeAdminPath(value);
}
