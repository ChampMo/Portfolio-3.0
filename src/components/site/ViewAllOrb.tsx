import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * End cap for the project rail.
 *
 * The rail only carries the starred projects, so it needs a visible exit to
 * the full archive — otherwise anything left unstarred is unreachable from
 * the home page. A round pad reads as a control rather than another card,
 * which keeps it from being mistaken for the last project.
 */
export default function ViewAllOrb({
  total,
  shown,
}: {
  /** Everything in the archive. */
  total: number;
  /** How many of those are already on the rail. */
  shown: number;
}) {
  // The point of the orb is what the rail is *not* showing, so that is the
  // number on it. "+3" answers "is it worth clicking?" in one glance; "04 in
  // archive" leaves the visitor doing the subtraction.
  const rest = Math.max(0, total - shown);
  const caption = `VIEW ALL PROJECTS  ·  ${String(total).padStart(2, "0")} IN ARCHIVE  ·  `;

  return (
    <div
      data-rail-card
      className="flex shrink-0 items-center justify-center px-[clamp(2rem,6vw,6rem)]"
    >
      <Link
        href="/work"
        data-cursor="ARCHIVE"
        aria-label={
          rest > 0
            ? `View all ${total} projects — ${rest} more than shown here`
            : `View all ${total} projects`
        }
        className="orb group relative grid size-[196px] place-items-center rounded-full border border-grid bg-panel transition-colors hover:border-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
      >
        {/* Circular caption. Rotates slowly on its own, faster on hover. */}
        <svg viewBox="0 0 196 196" className="orb-ring absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <path
              id="orb-arc"
              fill="none"
              d="M 98,98 m -74,0 a 74,74 0 1,1 148,0 a 74,74 0 1,1 -148,0"
            />
          </defs>
          <text className="orb-text">
            {/* Repeated so the caption meets itself around the full circle. */}
            <textPath href="#orb-arc" startOffset="0">
              {caption + caption}
            </textPath>
          </text>
        </svg>

        <span className="pointer-events-none flex size-[104px] flex-col items-center justify-center gap-0.5 rounded-full border border-grid bg-ground transition-colors group-hover:border-signal group-hover:bg-signal">
          {rest > 0 ? (
            <>
              <span className="font-display text-[2.4rem] leading-none tabular-nums text-signal transition-colors group-hover:text-on-signal">
                +{rest}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-muted transition-colors group-hover:text-on-signal">
                More
              </span>
            </>
          ) : (
            <ArrowRight
              size={22}
              aria-hidden="true"
              className="text-ink-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-ground"
            />
          )}
        </span>
      </Link>
    </div>
  );
}
