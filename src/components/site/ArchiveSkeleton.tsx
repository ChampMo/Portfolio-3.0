/**
 * Placeholder shown while an archive route streams in.
 *
 * Written as telemetry rather than the usual grey blocks: a pulsing "acquiring
 * signal" readout belongs to this site's world, and it reads as the machine
 * working instead of as a page that failed to paint.
 */
export default function ArchiveSkeleton({
  variant = "grid",
}: {
  variant?: "grid" | "record";
}) {
  const cells = variant === "grid" ? 6 : 3;

  return (
    <div className="min-h-svh bg-ground">
      <div className="h-[57px] border-b border-grid" />

      <div className="border-b border-grid px-[var(--pad-x)] py-14">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          <span className="text-signal">04</span> &nbsp;Acquiring signal
          <span className="skel-dots" aria-hidden="true" />
        </p>
        <div className="skel h-[clamp(2.6rem,8vw,6rem)] w-[min(560px,80%)] rounded-[10px]" />
      </div>

      <div className="mx-auto max-w-[1240px] px-[var(--pad-x)] py-12">
        <div className="mb-8 flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skel h-7 w-24 rounded-full" />
          ))}
        </div>

        <div
          className={
            variant === "grid"
              ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              : "grid gap-5"
          }
        >
          {Array.from({ length: cells }).map((_, i) => (
            <div
              key={i}
              className="rounded-[16px] border border-grid bg-panel p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="skel mb-4 h-3 w-1/3 rounded-full" />
              <div className="skel mb-4 h-28 w-full rounded-[10px]" />
              <div className="skel mb-3 h-6 w-2/3 rounded-full" />
              <div className="skel h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
