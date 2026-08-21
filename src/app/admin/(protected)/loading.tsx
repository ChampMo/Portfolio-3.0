/**
 * Suspense fallback for every page under the admin shell.
 *
 * Without a `loading.tsx` an App Router navigation has no boundary to fall
 * back to, so Next holds the old page on screen until the new one's server
 * work finishes. Every admin page is `force-dynamic` and reads the database,
 * which is a few hundred milliseconds of nothing happening after a click — the
 * navigation reads as "wait, then change" rather than "change, then load".
 *
 * One file covers all of them because it sits beside the shared layout: the
 * sidebar is part of that layout and stays put, and only the content area is
 * replaced. The skeleton copies the real page's opening shape — eyebrow, big
 * heading, then panels — so the swap to real content does not move anything
 * that was already drawn.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <header className="admin-head">
        <div className="admin-head-eyebrow flex items-baseline gap-4">
          <span className="skeleton h-[11px] w-6 rounded" />
          <span className="skeleton h-[11px] w-28 rounded" />
          <span aria-hidden="true" className="h-px flex-1 bg-grid" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="skeleton h-9 w-64 rounded" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
        {/* The item list, for the pages that have one. */}
        <div className="hidden flex-col gap-1.5 lg:flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="skeleton h-11 rounded-lg" />
          ))}
        </div>

        <div className="min-w-0">
          {[0, 1].map((panel) => (
            <section
              key={panel}
              className="mb-5 overflow-hidden rounded-card border border-grid bg-panel"
            >
              <div className="border-b border-grid px-5 py-3">
                <span className="skeleton block h-[10px] w-24 rounded" />
              </div>
              <div className="grid gap-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <span className="skeleton h-[62px] rounded-lg" />
                  <span className="skeleton h-[62px] rounded-lg" />
                </div>
                <span className="skeleton h-[62px] rounded-lg" />
                {panel === 1 ? <span className="skeleton h-[104px] rounded-lg" /> : null}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
