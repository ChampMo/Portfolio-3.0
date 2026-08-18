type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

const WIPE_MS = 620;

/**
 * Swaps the theme behind an expanding circular reveal.
 *
 * The View Transitions API snapshots the page before and after `apply` runs
 * and paints the two as stacked pseudo-elements. Cancelling its default
 * cross-fade and clipping the *new* snapshot to a growing circle makes the new
 * palette appear to spread from wherever the visitor clicked.
 *
 * Everything here is progressive: without `startViewTransition` — Firefox
 * today — or under reduced motion, `apply` simply runs and the theme changes
 * instantly, exactly as it did before.
 */
export function runThemeWipe(
  origin: { x: number; y: number } | null,
  apply: () => void
) {
  const doc = document as VTDocument;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof doc.startViewTransition !== "function" || reduce) {
    apply();
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  // Distance to the furthest corner, so the circle always finishes covering
  // the viewport no matter which corner the button sits in.
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = doc.startViewTransition(apply);

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: WIPE_MS,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    })
    .catch(() => {
      /* a transition can be cancelled by a second click — nothing to do */
    });
}
