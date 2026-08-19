import type { SkillDoc } from "@/models/Skill";
import type { IdentityDoc } from "@/models/Identity";
import SectionHead from "./SectionHead";

export default function TechForge({
  skills,
  identity,
}: {
  skills: SkillDoc | null;
  identity: IdentityDoc | null;
}) {
  const s = identity?.sections?.skills;
  const categories = (skills?.categories ?? [])
    .filter((c) => c.items.length > 0)
    .sort((a, b) => a.order - b.order);

  if (categories.length === 0) return null;

  return (
    <section id="skills" className="relative mx-auto max-w-[1240px] px-[var(--pad-x)] py-20 md:py-36">
      <span className="ghost-num" data-px="0.16" aria-hidden="true">02</span>

      <div className="relative z-[1]">
        <SectionHead
          index="02"
          eyebrow={s?.eyebrow || "Tech Forge"}
          lead={s?.lead || "The arsenal"}
          body={s?.body}
        />

        {/* 1px gaps over a grid-coloured background give hairline dividers
            without doubled borders between cells. */}
        <div
          className="grid gap-px overflow-hidden rounded-card border border-grid bg-grid sm:grid-cols-2 xl:grid-cols-4"
          data-reveal
        >
          {categories.map((cat, i) => (
            <div key={cat.name} className="group bg-panel p-7 transition-colors hover:bg-panel-2">
              <div className="mb-5 flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em]">
                <span className="tabular-nums text-signal">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="uppercase">{cat.name}</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-[9px] p-0">
                {cat.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-[9px] text-sm text-ink-muted transition-colors group-hover:text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className="size-1 shrink-0 rotate-45 bg-grid transition-colors group-hover:bg-signal"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
