/**
 * Absolute origin of this deployment, used for canonical URLs, social card
 * paths and the sitemap. `APP_URL` already exists for the OAuth redirect, so
 * there is one value to keep right rather than two that can drift apart.
 */
export const siteUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
