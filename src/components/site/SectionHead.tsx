import SplitText from "./SplitText";

export default function SectionHead({
  index,
  eyebrow,
  lead,
  body,
}: {
  index: string;
  eyebrow: string;
  lead?: string;
  body?: string;
}) {
  return (
    <>
      <div className="mb-13 flex flex-wrap items-baseline gap-[18px]" data-reveal>
        <span className="font-mono text-[11px] tracking-[0.16em] tabular-nums text-signal">
          {index}
        </span>
        <h2
          className="m-0 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted"
          data-scramble
        >
          {eyebrow}
        </h2>
        <span aria-hidden="true" className="h-px min-w-10 flex-1 bg-grid" />
      </div>

      {lead ? (
        <div className="mb-12" data-reveal>
          <SplitText
            as="h3"
            text={lead}
            className="mb-5 block font-display text-[clamp(2rem,4.4vw,3.4rem)] uppercase leading-[0.95]"
          />
          {body ? (
            <p className="m-0 max-w-[56ch] text-base leading-relaxed text-ink-muted">
              {body}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
