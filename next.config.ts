import type { NextConfig } from "next";

/**
 * Response headers applied to every route.
 *
 * A full Content-Security-Policy is deliberately NOT set here. Next injects
 * inline bootstrap scripts, so a real policy needs per-request nonces through
 * `proxy.ts`, and a CSP that is wrong is worse than none — it either breaks
 * hydration or is waved through with 'unsafe-inline' and protects nothing.
 * `frame-ancestors` is the one directive that stands alone safely, so it is
 * set on its own alongside the legacy header browsers still honour.
 */
const securityHeaders = [
  // Clickjacking. The admin panel is the reason this matters: without it the
  // whole thing can be framed invisibly over someone else's page.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },

  // Stops the browser second-guessing a declared Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Full URLs (including any query) stay inside the origin; cross-origin
  // requests send the origin alone.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Nothing here needs any of these, so none of them are available to a
  // script that manages to run.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

// Only meaningful over HTTPS, and pinning a dev machine to it would be a
// nuisance to undo. No `preload` — that is a submission you cannot easily
// take back, and it should be a deliberate decision, not a config default.
if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
