import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/data/queries";
import { siteUrl } from "@/lib/site/url";

// Projects are edited through the admin, so the map is built per request
// rather than frozen at deploy time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects();

  return [
    { url: `${siteUrl}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/work`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/products`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/resume`, changeFrequency: "monthly", priority: 0.6 },
    ...projects
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${siteUrl}/work/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
  ];
}
