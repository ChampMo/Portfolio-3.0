import { ImageResponse } from "next/og";
import { getIdentity } from "@/lib/data/queries";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/OgCard";

// Reads the database, so it must not be frozen into the build output — a
// statically prerendered card would keep showing whatever was in the DB on
// deploy day.
export const dynamic = "force-dynamic";

export const alt = "Monthol Sukjinda — Full-Stack Developer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const identity = await getIdentity();
  const first = identity?.profile.firstName || "Monthol";
  const lastName = identity?.profile.lastName || "Sukjinda";

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Signal // Portfolio"
        title={`${first} ${lastName}`}
        summary={
          identity?.profile.motto ||
          identity?.profile.role ||
          "Full-stack developer building for the web."
        }
        chips={identity?.profile.role ? [identity.profile.role] : []}
        status={identity?.availability.isOpen ? identity.availability.label : undefined}
        footer={identity?.contact.address || "Bangkok, Thailand"}
      />
    ),
    { ...size }
  );
}
