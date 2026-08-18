import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin is already gated, but keeping it out of the index means
        // the sign-in page never shows up in a search for the site's name.
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
