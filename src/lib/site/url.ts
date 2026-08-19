/**
 * Absolute origin of this deployment, used for canonical URLs, social card
 * paths and the sitemap.
 *
 * `APP_URL` is the intended source — it already exists for the OAuth redirect,
 * so there is one value to keep right rather than two that can drift apart.
 *
 * The fallbacks matter more than they look. With `APP_URL` unset in
 * production this resolved to `http://localhost:3000`, and `metadataBase`
 * dutifully stamped that into every absolute URL Next generates — including
 * `og:image`. Chat apps fetched the card from *their own* localhost, got
 * nothing, and showed a link with title and description but no picture, while
 * the card route itself was working perfectly. Vercel injects the deployment
 * host into `VERCEL_PROJECT_PRODUCTION_URL` and `VERCEL_URL`, so a missing
 * `APP_URL` now degrades to the right origin instead of a broken one.
 */
function resolve(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit;

  // The stable production host, which survives preview deployments.
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod}`;

  // Whatever this particular deployment is reachable at.
  const current = process.env.VERCEL_URL?.trim();
  if (current) return `https://${current}`;

  return "http://localhost:3000";
}

export const siteUrl = resolve().replace(/\/+$/, "");
