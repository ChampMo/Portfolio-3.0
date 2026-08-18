import { ImageResponse } from "next/og";
import { getProjectBySlug } from "@/lib/data/queries";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/OgCard";

export const alt = "Project";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image(props: {
  // Next 16: params arrives as a Promise here too.
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await getProjectBySlug(slug);

  return new ImageResponse(
    (
      <OgCard
        eyebrow={project?.codename || "04 // Mission Archives"}
        title={project?.name || "Project"}
        summary={project?.summary || project?.description?.slice(0, 160) || undefined}
        chips={project?.stack ?? []}
        status={project?.status.replace("_", " ")}
        footer={project?.year ? `${project.role || "Project"} · ${project.year}` : "Monthol Sukjinda"}
      />
    ),
    { ...size }
  );
}
