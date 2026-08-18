import { ImageResponse } from "next/og";
import { getProjects } from "@/lib/data/queries";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/OgCard";

// Reads the database, so it must not be frozen into the build output — a
// statically prerendered card would keep showing whatever was in the DB on
// deploy day.
export const dynamic = "force-dynamic";

export const alt = "Mission Archives";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const projects = await getProjects();
  // Most-used technologies, so the card advertises the actual toolkit.
  const tally = new Map<string, number>();
  for (const p of projects) {
    for (const t of p.stack) tally.set(t, (tally.get(t) ?? 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="04 // Mission Archives"
        title="The full record"
        summary={`${projects.length} project${projects.length === 1 ? "" : "s"}, filterable by tag, stack and status.`}
        chips={top}
        footer="Monthol Sukjinda"
      />
    ),
    { ...size }
  );
}
