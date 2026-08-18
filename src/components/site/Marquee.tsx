/**
 * Velocity-reactive marquee. Each track is duplicated so the JS loop can wrap
 * it seamlessly by translating one copy's width; `data-mq` sets direction.
 */
function Track({ items, dir, dim }: { items: string[]; dir: number; dim?: boolean }) {
  if (items.length === 0) return null;
  const line = items.join("  ·  ");
  return (
    <div className="overflow-hidden">
      <div
        className={`flex w-max gap-[38px] font-mono tracking-[0.18em] whitespace-nowrap ${
          dim ? "text-[10px] text-grid" : "text-[11px] text-ink-muted"
        }`}
        data-mq={dir}
      >
        <span>{line}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
        <span>{line}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
      </div>
    </div>
  );
}

export default function Marquee({ primary, secondary }: { primary: string[]; secondary: string[] }) {
  if (primary.length === 0 && secondary.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-[9px] overflow-hidden border-y border-grid bg-panel py-3.5"
      aria-hidden="true"
    >
      <Track items={primary} dir={1} />
      <Track items={secondary} dir={-0.55} dim />
    </div>
  );
}
