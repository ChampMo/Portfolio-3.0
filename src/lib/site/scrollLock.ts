"use client";

/**
 * Reference-counted page scroll lock.
 *
 * Several overlays can be open at once — a lightbox with the command palette
 * on top of it, for instance. Each one used to set and clear
 * `body.style.overflow` on its own, so whichever closed first unlocked the
 * page underneath the one still open. Counting means the lock lifts only when
 * the last holder lets go, and the original value is restored rather than
 * assumed to be "".
 */
let holders = 0;
let previous = "";

export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (holders === 0) {
    previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  holders += 1;

  let released = false;
  return () => {
    // Effects can run their cleanup more than once (React's development
    // double-invoke), and a double release would drop someone else's lock.
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) document.body.style.overflow = previous;
  };
}
