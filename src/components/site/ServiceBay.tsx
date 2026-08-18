import type { ServiceDoc } from "@/models/Service";
import type { IdentityDoc } from "@/models/Identity";
import SectionHead from "./SectionHead";
import PatchBay, { type LinkedProject } from "./PatchBay";

export default function ServiceBay({
  services,
  identity,
  projects = [],
}: {
  services: ServiceDoc[];
  identity: IdentityDoc | null;
  projects?: LinkedProject[];
}) {
  if (services.length === 0) return null;
  const s = identity?.sections?.services;

  return (
    <section id="services" className="relative mx-auto max-w-[1240px] px-[var(--pad-x)] py-36">
      <span className="ghost-num" data-px="0.16" aria-hidden="true">03</span>

      <div className="relative z-[1]">
        <SectionHead
          index="03"
          eyebrow={s?.eyebrow || "Service Bay"}
          lead={s?.lead || "What I can take on"}
          body={s?.body || "Four channels, patched in on demand. Select one to read its spec."}
        />
        <PatchBay services={services} projects={projects} />
      </div>
    </section>
  );
}
