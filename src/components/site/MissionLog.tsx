import type { ExperienceDoc } from "@/models/Experience";
import type { IdentityDoc } from "@/models/Identity";
import SectionHead from "./SectionHead";

export default function MissionLog({
  experience,
  identity,
}: {
  experience: ExperienceDoc[];
  identity: IdentityDoc | null;
}) {
  if (experience.length === 0) return null;
  const s = identity?.sections?.experience;

  return (
    <section id="log" className="relative mx-auto max-w-[1240px] px-[var(--pad-x)] py-20 md:py-36">
      <span className="ghost-num" data-px="0.16" aria-hidden="true">05</span>

      <div className="relative z-[1]">
        <SectionHead
          index="05"
          eyebrow={s?.eyebrow || "Mission Log"}
          lead={s?.lead || "Trajectory so far"}
          body={s?.body}
        />

        <div className="flex flex-col">
          {experience.map((e) => (
            <div
              key={e._id}
              className="grid gap-4 border-t border-grid py-9 last:border-b md:grid-cols-[130px_1fr] md:gap-8"
              data-reveal
            >
              <div
                className="font-mono text-[11px] tracking-[0.1em] tabular-nums text-ink-muted"
                data-px="0.13"
              >
                <span className="mb-[7px] block text-signal">{e.time}</span>
                {e.type}
                {e.location ? (
                  <>
                    <br />
                    {e.location}
                  </>
                ) : null}
              </div>

              <div>
                <h4 className="mb-[5px] text-[19px] font-semibold leading-snug">{e.role}</h4>
                {e.organization ? (
                  <p className="mb-4 font-mono text-xs tracking-[0.04em] text-telemetry">
                    {e.organization}
                  </p>
                ) : null}
                {e.summary ? (
                  <p className="mb-4 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">
                    {e.summary}
                  </p>
                ) : null}

                {e.achievements.length > 0 ? (
                  <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
                    {e.achievements.map((a) => (
                      <li key={a} className="relative pl-4 text-[13.5px] leading-snug text-ink-muted">
                        <span aria-hidden="true" className="absolute left-0 top-2 h-px w-1.5 bg-signal" />
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* The chip row the previous data model had no field for. */}
                {e.stack.length > 0 ? (
                  <div className="flex flex-wrap gap-[7px]">
                    {e.stack.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-grid px-2.5 py-[5px] font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
