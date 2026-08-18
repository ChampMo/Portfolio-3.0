/**
 * The access control list lives in env, not the database, so revoking access
 * is a config change and never requires a migration or an admin UI action.
 *
 * ADMIN_ALLOWED_EMAILS="a@x.com, b@y.com"
 */
export function allowedEmails(): string[] {
  return (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string): boolean {
  const list = allowedEmails();
  // An empty allowlist denies everyone. Failing closed matters here: a missing
  // or typo'd env var must never silently open the admin panel to any Google
  // account on the internet.
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
