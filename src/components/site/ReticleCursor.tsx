"use client";

import { useEffect, useRef } from "react";

/** How long the pointer must sit still before the reticle amuses itself. */
const IDLE_MS = 10_000;
/** How long before it settles into its waiting pose. Short: this is not an
 *  event, it is the reticle stopping fidgeting with the pointer. */
const REST_MS = 1_200;

/**
 * Replaces the system cursor with a four-corner targeting reticle that lags
 * behind the pointer and reads out its viewport coordinates.
 *
 * Hovering anything carrying `data-cursor="LABEL"` widens the box and swaps
 * the coordinates for that label.
 *
 * Only engages for `pointer: fine` and when reduced motion is not requested —
 * hiding the system cursor on a touch device or for a visitor who has asked
 * for less motion would be a usability regression, not a flourish.
 *
 * Position is written straight to the DOM inside a rAF loop rather than held
 * in React state: this updates every frame and re-rendering the tree at 60fps
 * to move one element would be wasteful.
 *
 * ── Idle acts ──
 * After ten seconds without input the reticle stops waiting and does something:
 * it wanders looking for a target, locks onto a real element on the page, or
 * chases a stray mote and catches it. This replaced a full-screen "standby"
 * overlay — an overlay announces that the *page* gave up, which reads as a
 * complaint, while an instrument that fidgets reads as something still awake
 * and paying attention. Any input at all cancels the act on the spot.
 */
export default function ReticleCursor() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const readRef = useRef<HTMLSpanElement | null>(null);
  const moteRef = useRef<HTMLSpanElement | null>(null);
  const burstRef = useRef<HTMLSpanElement | null>(null);
  const linesRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const read = readRef.current;
    const mote = moteRef.current;
    const burst = burstRef.current;
    const lines = linesRef.current;
    if (!root || !read || !mote || !burst || !lines) return;

    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    document.body.classList.add("reticle-on");

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let seen = false;
    let raf = 0;

    /** Follow strength. Idle acts slow it down so the reticle drifts. */
    let ease = 0.2;

    const coords = () =>
      `${Math.round(x).toString().padStart(3, "0")} / ${Math.round(y)
        .toString()
        .padStart(3, "0")}`;

    // ───────────────────────── idle acts ─────────────────────────

    type Act = {
      until: number;
      step: (t: number) => void;
      cleanup?: () => void;
      /** Runs only when input cut the act short — DOZE startles awake here. */
      wake?: () => void;
    };

    let act: Act | null = null;
    let lastMove = performance.now();
    /**
     * Last position an actual movement was seen at.
     *
     * Chrome re-dispatches `mousemove` whenever animated content shifts under a
     * stationary pointer, and this site animates something on every frame — the
     * marquee, the parallax layers, the ghost numerals. Treating those as input
     * meant the idle timer was reset ~60 times a second and could never expire.
     */
    let lastX = -1;
    let lastY = -1;
    /**
     * True until the visitor first moves the mouse. The reticle introduces
     * itself by playing straight through the whole repertoire, so the page is
     * already demonstrating what the cursor does before anyone has touched it.
     */
    let intro = true;
    /** Position in the intro cycle, so the demo shows every act in turn. */
    let introAt = 0;
    /**
     * True while the pointer is outside the window.
     *
     * The reticle used to simply vanish. But the moment the visitor's mouse
     * is somewhere else is exactly when nothing on the page is moving, so
     * instead it stays on screen and keeps working on its own — a stand-in
     * cursor rather than a puppet of a mouse that has left. The real pointer
     * is never touched: this only ever moves the reticle's own target.
     */
    let away = false;
    /**
     * Set by the leave events, cleared by a real move.
     *
     * `away` itself is recomputed every frame from this plus
     * `document.hasFocus()`, rather than being flipped by handlers. Event
     * delivery here is not dependable — `mouseleave` on the document misses
     * exits, `mouseenter` misses returns, and switching windows with the
     * keyboard fires neither — so the state is polled instead of trusted to
     * arrive. The loop is already running every frame; asking two cheap
     * questions in it costs nothing and cannot be missed.
     */
    let pointerOut = false;
    /**
     * The other half of `away`: the window itself is in the background.
     *
     * Kept as a latch rather than polling `document.hasFocus()` each frame.
     * The poll could never be talked out of it: clicking another app and
     * then moving the mouse back over the page leaves the window unfocused,
     * so every frame re-decided that nobody was here and the reticle went
     * on performing over a pointer that had plainly come back. A latch can
     * be cleared by the one thing that settles the question — an actual
     * mouse movement inside the window, which fires whether or not the
     * window has focus.
     */
    let unfocused = !document.hasFocus();
    /** Index of the last idle act, so a random pick never repeats itself. */
    let lastAct = -1;

    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

    function resetAppearance() {
      ease = 0.2;
      root!.classList.remove(
        "is-scan",
        "is-lock",
        "is-catch",
        "is-cal",
        "is-cal-done",
        "is-doze",
        "is-patrol",
        "is-term",
        "is-face"
      );
      delete root!.dataset.mood;
      root!.style.removeProperty("--lock-w");
      root!.style.removeProperty("--lock-h");
    }

    function endAct(cancelled = false) {
      if (!act) return;
      if (cancelled) act.wake?.();
      act.cleanup?.();
      act = null;
      intro = false;
      resetAppearance();
      read!.textContent = coords();
    }

    /**
     * Runs acts back to back as one act.
     *
     * `until` is reassigned as each part finishes, because a part's duration is
     * only known once it has been built — LOCK, for one, has to measure the
     * element it picked before it knows how long it needs.
     */
    function chain(now: number, parts: Array<(t: number) => Act>): Act {
      let i = 0;
      let cur = parts[0](now);

      const self: Act = {
        until: cur.until,
        step(t) {
          cur.step(t);
          if (t > cur.until && i < parts.length - 1) {
            cur.cleanup?.();
            resetAppearance();
            i += 1;
            cur = parts[i](t);
            self.until = cur.until;
          }
        },
        cleanup() {
          cur.cleanup?.();
        },
      };

      return self;
    }

    /** Elements currently on screen that are big enough to be worth noticing. */
    function targets(): HTMLElement[] {
      return Array.from(
        document.querySelectorAll<HTMLElement>(
          "h1, h2, h3, [data-cursor], button, a[href], img"
        )
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 70 &&
          r.width < window.innerWidth * 0.8 &&
          r.height > 22 &&
          r.top > 56 &&
          r.bottom < window.innerHeight - 40
        );
      });
    }

    const labelOf = (el: HTMLElement) =>
      (el.dataset.cursor || el.textContent || el.tagName)
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 22)
        .toUpperCase() || "TARGET";

    function bracket(r: DOMRect) {
      root!.style.setProperty("--lock-w", `${Math.round(r.width + 22)}px`);
      root!.style.setProperty("--lock-h", `${Math.round(r.height + 18)}px`);
      root!.classList.add("is-lock");
    }

    /** Four random glyphs, for readouts meant to look like live noise. */
    const noise = () =>
      Array.from({ length: 4 }, () =>
        "ABCDEF0123456789/#%*".charAt(Math.floor(Math.random() * 20))
      ).join("");

    /**
     * SCAN — wanders, with pauses.
     *
     * The legs are deliberately uneven: quick darts, slow drifts, and two
     * stops where it holds still as though it thought it saw something. Even
     * legs at an even speed read as a machine on rails, which is the opposite
     * of what this act is for.
     */
    function scan(now: number): Act {
      const legs: Array<{ t0: number; t1: number; x: number; y: number; hold: boolean }> = [];
      let t = 0;

      for (let i = 0; i < 6; i++) {
        const ms = 620 + Math.random() * 620;
        legs.push({
          t0: t,
          t1: t + ms,
          x: clamp(x + (Math.random() - 0.5) * window.innerWidth * 0.6, 70, window.innerWidth - 70),
          y: clamp(y + (Math.random() - 0.5) * window.innerHeight * 0.55, 70, window.innerHeight - 70),
          hold: false,
        });
        t += ms;

        // Pause after the second and fourth leg — the "wait, what was that?".
        if (i === 1 || i === 3) {
          const last = legs[legs.length - 1];
          legs.push({ t0: t, t1: t + 640, x: last.x, y: last.y, hold: true });
          t += 640;
        }
      }

      root!.classList.add("is-scan");
      ease = 0.045;

      return {
        until: now + t + 300,
        step(tt) {
          const p = tt - now;
          const leg = legs.find((l) => p >= l.t0 && p < l.t1) ?? legs[legs.length - 1];
          targetX = leg.x;
          targetY = leg.y;
          // Tighter during a hold, so it settles instead of gliding onward.
          ease = leg.hold ? 0.12 : 0.045;

          read!.textContent = leg.hold
            ? `CONTACT? ${noise()}`
            : "SCANNING" + ".".repeat(Math.floor(tt / 300) % 4);
        },
      };
    }

    /**
     * LOCK — picks a real element and studies it.
     *
     * Five beats rather than one: approach, clamp, name it, read its
     * measurements, release. The measurement beat is what makes it look like
     * an instrument doing a job instead of a box that changed size.
     */
    function lock(now: number): Act {
      const candidates = targets();
      if (candidates.length === 0) return scan(now);

      const el = candidates[Math.floor(Math.random() * candidates.length)];
      const r = el.getBoundingClientRect();
      const label = labelOf(el);
      const size = `${Math.round(r.width)}×${Math.round(r.height)}`;
      const range = Math.round(Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y));

      ease = 0.12;
      targetX = r.left + r.width / 2;
      targetY = r.top + r.height / 2;

      let clamped = false;

      return {
        until: now + 4600,
        step(tt) {
          const p = tt - now;

          // Clamped only once it has arrived, so the brackets snap shut on the
          // target rather than growing on the way over.
          if (!clamped && p > 520) {
            clamped = true;
            bracket(r);
          }

          read!.textContent =
            p < 520
              ? `ACQUIRING ${noise()}`
              : p < 1500
                ? "TARGET ACQUIRED"
                : p < 2600
                  ? label
                  : p < 3700
                    ? `${size} · RNG ${range}`
                    : "RELEASING";

          if (p > 3700) {
            root!.classList.remove("is-lock");
            // A small recoil, so it lets go rather than blinking off.
            targetX = r.left + r.width / 2 + 30;
          }
        },
      };
    }

    /**
     * CHASE — a mote drifts past and the reticle goes after it.
     *
     * Four beats: notice, pursue, lose it to a sideways juke, then catch. The
     * juke is the whole point — a chase that never fails is just a follow.
     */
    function chase(now: number): Act {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const pt = (ax: number, ay: number) => ({
        x: clamp(ax, 70, w - 70),
        y: clamp(ay, 70, h - 70),
      });

      // A lazy drift, a dart away, a juke, a recovery, a second juke, then a
      // tired settle where it finally gets caught.
      const a = pt(x + (Math.random() < 0.5 ? -1 : 1) * 240, y - 140);
      const b = pt(a.x + (Math.random() - 0.5) * 460, a.y + 200);
      const c = pt(b.x + (Math.random() < 0.5 ? -1 : 1) * 400, b.y - 150);
      const d = pt(c.x + (Math.random() - 0.5) * 320, c.y + 160);
      const e = pt(d.x + (Math.random() < 0.5 ? -1 : 1) * 300, d.y - 110);
      const f = pt(e.x + (Math.random() - 0.5) * 220, e.y + 80);

      const phases = [
        { t0: 0, t1: 1700, from: a, to: a, e: 0.05, read: "CONTACT" },
        { t0: 1700, t1: 3800, from: a, to: b, e: 0.1, read: "TRACKING" },
        { t0: 3800, t1: 5000, from: b, to: c, e: 0.05, read: "LOST" },
        { t0: 5000, t1: 6900, from: c, to: d, e: 0.16, read: "REACQUIRED" },
        { t0: 6900, t1: 8000, from: d, to: e, e: 0.06, read: "EVADING" },
        { t0: 8000, t1: 10200, from: e, to: f, e: 0.19, read: "CLOSING" },
      ];

      mote!.classList.add("is-on");
      let burstAt = 0;

      return {
        until: now + 11400,
        step(tt) {
          const p = tt - now;
          const ph = phases.find((q) => p >= q.t0 && p < q.t1);

          if (ph) {
            const k = (p - ph.t0) / (ph.t1 - ph.t0);
            const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            // The wobble is what stops the mote reading as a tweened dot.
            const mx = ph.from.x + (ph.to.x - ph.from.x) * eased + Math.sin(p / 130) * 22;
            const my = ph.from.y + (ph.to.y - ph.from.y) * eased + Math.cos(p / 170) * 16;

            mote!.style.transform = `translate(${mx.toFixed(1)}px, ${my.toFixed(1)}px)`;
            targetX = mx;
            targetY = my;
            ease = ph.e;
            read!.textContent = ph.read;
            return;
          }

          if (!burstAt) {
            burstAt = p;
            // The burst is parked exactly where the mote died and the mote is
            // hidden outright. Scaling the single dot up instead made it look
            // like it slid away rather than came apart.
            burst!.style.transform = mote!.style.transform;
            burst!.classList.add("is-on");
            mote!.classList.remove("is-on");
            root!.classList.add("is-catch");
            read!.textContent = "CAPTURED";
          }
        },
        cleanup() {
          mote!.classList.remove("is-on", "is-caught");
          burst!.classList.remove("is-on");
        },
      };
    }

    /**
     * A — CALIBRATE. Stays exactly where it is and runs a self-test.
     *
     * The only act that does not travel, which is why it is in the set: a pool
     * where every act crosses the screen starts to feel like one long idea.
     */
    function calibrate(now: number): Act {
      root!.classList.add("is-cal");

      /**
       * Pinned where the act begins, and held there every frame.
       *
       * Not doing this was the real drift: an act inherits whatever target the
       * previous one left behind, and PATROL in particular finishes with the
       * target parked against a screen edge. CALIBRATE would then glide all the
       * way over there while claiming to stand still, and end somewhere it
       * never meant to be. The one act that does not travel has to say so.
       */
      const homeX = x;
      const homeY = y;
      ease = 0.2;

      const checks = [
        "AXIS X",
        "AXIS Y",
        "FOCUS",
        "RANGE",
        "OPTICS",
        "SIGNAL",
        "PARALLAX",
        "GAIN",
      ];
      const per = 1000;
      const run = per * checks.length;

      return {
        until: now + run + 2600,
        step(tt) {
          const p = tt - now;
          targetX = homeX;
          targetY = homeY;

          if (p >= run) {
            root!.classList.add("is-cal-done");
            read!.textContent = "ALL SYSTEMS OK";
            return;
          }

          const i = Math.floor(p / per);
          const k = p % per;
          read!.textContent =
            k < per * 0.45 ? `${checks[i]} ${noise()}` : `${checks[i]} · OK`;
        },
        cleanup() {
          root!.classList.remove("is-cal-done");
        },
      };
    }

    /**
     * B — DOZE. Folds down to a single breathing dot and drifts off.
     *
     * Its payoff is `wake`, not `step`: the reticle startles when the visitor
     * comes back, so the best moment belongs to them rather than to the
     * animation. It is the one act that ends better than it plays.
     */
    function doze(now: number): Act {
      root!.classList.add("is-doze");
      ease = 0.05;

      // Drifts a few pixels while asleep, the way a head nods.
      const ax = x;
      const ay = y;

      return {
        until: now + 11600,
        step(tt) {
          const p = tt - now;
          targetX = ax + Math.sin(p / 1600) * 14;
          targetY = ay + Math.cos(p / 2100) * 9;

          read!.textContent =
            p < 1100
              ? "POWERING DOWN"
              : // Two short beats of nonsense — it is dreaming.
                (p > 4000 && p < 4900) || (p > 7600 && p < 8400)
                ? `${noise()} ${noise()}`
                : p > 9600
                  ? "STANDBY · Zz"
                  : "IDLE";
        },
        wake() {
          root!.classList.remove("is-doze");
          root!.classList.add("is-startle");
          window.setTimeout(() => root!.classList.remove("is-startle"), 560);
        },
      };
    }

    /**
     * C — PATROL. Marches to the nearest edge and walks a beat along it.
     *
     * Deliberately stiff — a high follow strength and straight lines, where
     * SCAN drifts and wanders. Two acts that both cross the screen have to
     * move differently or the reticle reads as having one gait. It stops at
     * each end of the beat to look around before turning back.
     */
    function patrol(now: number): Act {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const inset = 64;

      // Nearest edge, so it does not trek across the page just to start.
      const edge = [
        { edge: "left", d: x },
        { edge: "right", d: w - x },
        { edge: "top", d: y },
        { edge: "bottom", d: h - y },
      ].sort((p, q) => p.d - q.d)[0].edge;

      const vertical = edge === "left" || edge === "right";
      const fixed =
        edge === "left"
          ? inset
          : edge === "right"
            ? w - inset
            : edge === "top"
              ? inset
              : h - inset;
      const span = vertical ? h : w;
      const legA = inset + span * 0.16;
      const legB = span - inset - span * 0.16;

      root!.classList.add("is-patrol");
      ease = 0.24;

      const sector = String(1 + Math.floor(Math.random() * 8)).padStart(2, "0");
      const march = 2900;
      const dwell = 1700;

      return {
        until: now + 1000 + march * 2 + dwell * 2 + 800,
        step(tt) {
          const p = tt - now;
          let along = legA;
          let label = `MOVING TO POST ${sector}`;

          if (p < 1000) {
            along = legA;
          } else if (p < 1000 + march) {
            along = legA + (legB - legA) * ((p - 1000) / march);
            label = `PATROL · SECTOR ${sector}`;
          } else if (p < 1000 + march + dwell) {
            // A look around at the far end, then turn back.
            along = legB + Math.sin((p - 1000 - march) / 110) * 22;
            label = "PERIMETER CLEAR";
          } else if (p < 1000 + march * 2 + dwell) {
            along = legB - (legB - legA) * ((p - 1000 - march - dwell) / march);
            label = `PATROL · SECTOR ${sector}`;
          } else {
            along = legA + Math.sin((p - 1000 - march * 2 - dwell) / 110) * 22;
            label = "POST SECURE";
          }

          if (vertical) {
            targetX = fixed;
            targetY = clamp(along, 40, h - 40);
          } else {
            targetX = clamp(along, 40, w - 40);
            targetY = fixed;
          }
          read!.textContent = label;
        },
      };
    }

    /**
     * E — SURVEY. Ticks across several elements in turn, counting them.
     *
     * LOCK studies one thing; this takes inventory. As a side effect it walks
     * the visitor's eye around the page, which is the most useful thing any of
     * these acts does — so each stop is held long enough for its label to
     * actually be read.
     */
    function survey(now: number): Act {
      const all = targets();
      if (all.length < 2) return calibrate(now);

      // Nearest first, so the sweep reads as a path rather than teleporting.
      const picked = all
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            el,
            r,
            d: Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y),
          };
        })
        .sort((p, q) => p.d - q.d)
        .slice(0, 7);

      const per = 1150;
      const run = per * picked.length;
      ease = 0.28;
      let shown = -1;

      return {
        until: now + run + 2400,
        step(tt) {
          const p = tt - now;

          if (p >= run) {
            root!.classList.remove("is-lock");
            // Counts up rather than stating the total, so the tally lands.
            const k = Math.min(1, (p - run) / 1400);
            const n = Math.round(picked.length * k);
            read!.textContent =
              k < 1
                ? `${String(n).padStart(2, "0")} …`
                : `${String(picked.length).padStart(2, "0")} OBJECTS LOGGED`;
            return;
          }

          const i = Math.floor(p / per);
          if (i !== shown) {
            shown = i;
            const { r } = picked[i];
            targetX = r.left + r.width / 2;
            targetY = r.top + r.height / 2;
            bracket(r);
          }
          read!.textContent = `${String(i + 1).padStart(2, "0")} · ${labelOf(picked[i].el)}`;
        },
      };
    }

    /**
     * TERMINAL — the frame widens into a small screen and runs a job on it.
     *
     * The numbers in the log are read off the page as the act starts: the real
     * viewport, the real count of things worth pointing at. It costs nothing
     * and it is the difference between a prop that says "computer" and an
     * instrument that is actually looking at something — the same reason LOCK
     * reads out the name of the element it caught.
     */
    function terminal(now: number): Act {
      // Held still. Like CALIBRATE, this act would otherwise inherit whatever
      // target the previous one left behind and slide off mid-sentence.
      const homeX = x;
      const homeY = y;
      const found = targets().length;

      const log = [
        "> init reticle.core",
        "  bus ............... online",
        "  optics ............ ok",
        `  viewport .......... ${window.innerWidth}x${window.innerHeight}`,
        "",
        "> scan.index",
        `  candidates ........ ${found}`,
        "  depth ............. 3",
        "  parallax .......... locked",
        "",
        "> signal.sweep",
        "  sector 01 ......... clear",
        "  sector 02 ......... clear",
        `  sector 03 ......... ${found > 6 ? "dense" : "clear"}`,
        "  sector 04 ......... clear",
        "",
        "> telemetry.flush",
        "  buffer ............ 4.2 kb",
        "  dropped ........... 0",
        "  latency ........... 8 ms",
        "",
        "> archive.verify",
        "  checksum .......... ok",
        "  manifest .......... ok",
        "",
        "> idle.loop",
        "  waiting for input",
        "  .",
        "  ..",
        "  ...",
      ];

      lines!.textContent = log.join("\n");
      root!.classList.add("is-term");
      ease = 0.18;

      const LINE_H = 13;
      const open = 700;
      const run = 9200;
      const total = log.length * LINE_H;

      return {
        until: now + open + run + 900,
        step(tt) {
          const p = tt - now;
          targetX = homeX;
          targetY = homeY;

          // Scrolls only while the screen is open, and stops at the last line
          // rather than running off into blank space.
          const k = Math.max(0, Math.min(1, (p - open) / run));
          const offset = Math.max(0, total - 74) * k;
          lines!.style.transform = `translateY(${-offset.toFixed(1)}px)`;

          read!.textContent =
            p < open
              ? "OPENING"
              : k < 1
                ? `RUN ${String(Math.round(k * 100)).padStart(3, "0")}%`
                : "DONE";
        },
        cleanup() {
          lines!.style.transform = "";
        },
      };
    }

    /**
     * FACE — the frame opens into a square and the centre dot becomes a face.
     *
     * The one act with no instrument language in it at all. Everything else
     * here performs competence: scanning, locking, logging. This one just has
     * a mood, which is the only way a cursor reads as a character rather than
     * as a very good tool.
     *
     * Expressions are a timeline of moods on a data attribute; the shapes and
     * the easing between them are CSS, so the JS never touches geometry.
     */
    function face(now: number): Act {
      // Held still, for the same reason as CALIBRATE and TERMINAL: an act that
      // stays put has to say so, or it inherits the last act's target.
      const homeX = x;
      const homeY = y;

      const script: Array<{ at: number; mood: string; read: string }> = [
        { at: 0, mood: "sleep", read: "BOOT" },
        { at: 800, mood: "idle", read: "HELLO" },
        { at: 2100, mood: "look-l", read: "HM…" },
        { at: 3200, mood: "look-r", read: "HM…" },
        { at: 4300, mood: "happy", read: ":)" },
        { at: 5600, mood: "surprised", read: "!" },
        { at: 6800, mood: "look-l", read: "…" },
        { at: 7700, mood: "wink", read: ";)" },
        { at: 8900, mood: "happy", read: "OK" },
        { at: 10100, mood: "idle", read: "BYE" },
        { at: 11000, mood: "sleep", read: "" },
      ];

      root!.classList.add("is-face");
      ease = 0.16;
      let shown = "";

      return {
        until: now + 11800,
        step(tt) {
          const p = tt - now;
          targetX = homeX;
          targetY = homeY;

          // Last cue whose time has passed — a plain scan, since the list is
          // short and always in order.
          let cue = script[0];
          for (const c of script) if (p >= c.at) cue = c;

          if (cue.mood !== shown) {
            shown = cue.mood;
            root!.dataset.mood = cue.mood;
          }
          read!.textContent = cue.read;
        },
        cleanup() {
          delete root!.dataset.mood;
        },
      };
    }

    /** SCAN and LOCK are one act: wander, then settle on something found. */
    const sweep = (now: number) => chain(now, [scan, lock]);

    const ACTS = [sweep, chase, calibrate, doze, patrol, survey, terminal, face];

    /**
     * Walks the repertoire in order rather than at random.
     *
     * The introduction has a job the idle acts do not: show what this thing
     * can do. Random picks would repeat some acts and skip others entirely for
     * as long as the visitor watched.
     */
    function nextIntroAct(now: number): Act {
      const make = ACTS[introAt % ACTS.length];
      introAt += 1;
      return make(now);
    }

    function pickAct(now: number): Act {
      if (ACTS.length === 1) return ACTS[0](now);
      let i = lastAct;
      while (i === lastAct) i = Math.floor(Math.random() * ACTS.length);
      lastAct = i;
      return ACTS[i](now);
    }

    // ─────────────────────────── input ───────────────────────────

    function onMove(e: MouseEvent) {
      // A move inside the window is the one unambiguous sign the pointer is
      // here, whatever the enter and focus events did or did not do.
      pointerOut = false;
      unfocused = false;

      // A pixel of slack: a redispatch at the same coordinates is not input.
      if (Math.abs(e.clientX - lastX) > 1 || Math.abs(e.clientY - lastY) > 1) {
        lastMove = performance.now();
        endAct(true);
      }
      lastX = e.clientX;
      lastY = e.clientY;

      targetX = e.clientX;
      targetY = e.clientY;

      if (!seen) {
        seen = true;
        x = targetX;
        y = targetY;
        root!.classList.add("is-live");
      }

      const hit = (e.target as Element | null)?.closest?.("[data-cursor]");
      if (hit instanceof HTMLElement && hit.dataset.cursor) {
        root!.classList.add("is-wide");
        // `data-cursor-mode` opts a target into a richer shape: "ring" spins a
        // label around the reticle, "pan" shows left/right travel arrows.
        const mode = hit.dataset.cursorMode ?? "";
        root!.classList.toggle("is-ring", mode === "ring");
        root!.classList.toggle("is-pan", mode === "pan");
        read!.textContent = hit.dataset.cursor;
      } else {
        root!.classList.remove("is-wide");
        root!.classList.remove("is-ring");
        root!.classList.remove("is-pan");
        read!.textContent = `${Math.round(targetX).toString().padStart(3, "0")} / ${Math.round(
          targetY
        )
          .toString()
          .padStart(3, "0")}`;
      }
    }

    const onLeave = () => {
      pointerOut = true;
    };
    const onEnter = () => {
      pointerOut = false;
    };

    function loop() {
      const now = performance.now();

      // Either latch is enough to be away; a real move clears both, so
      // coming back always hands control straight over.
      const nowAway = pointerOut || unfocused;
      if (nowAway !== away) {
        away = nowAway;
        root!.classList.toggle("is-ghost", away);
        if (away) {
          root!.classList.add("is-live");
          // A full ten seconds from the moment of leaving, and nothing carried
          // across the boundary. Letting the old clock run meant an act could
          // fire the instant the pointer cleared the edge, because the
          // countdown had already been ticking; and an act already under way
          // simply continued, which looks the same from outside.
          //
          // The introduction is the exception. It runs until the visitor takes
          // over, and a pointer that has never been inside the window has not
          // taken over — so it is left alone rather than cut off.
          if (!intro) {
            lastMove = now;
            endAct();
          }
        } else {
          // Hands control straight back; the reticle eases over to the real
          // pointer on the next move rather than snapping to it.
          lastMove = now;
          endAct(true);
        }
      }

      if (act) {
        act.step(now);
        if (now > act.until) {
          // The intro repeats immediately until the visitor takes over. An
          // idle act instead restarts the countdown, so the reticle rests for
          // another ten seconds before doing anything again — without this the
          // clock is already expired the moment an act ends and the next one
          // begins on the very next frame, which is a cursor that never sits
          // still rather than one that occasionally fidgets.
          const wasIntro = intro;
          endAct();
          if (wasIntro) {
            intro = true;
            act = nextIntroAct(now);
          } else {
            // Ten seconds of rest before the next one, away or not. Only
            // the introduction runs back to back, because that one is a
            // demonstration rather than a cursor idling.
            lastMove = now;
          }
        }
      } else if (
        !intro &&
        // `seen` may still be false if the pointer left before ever moving.
        // The reticle is on screen either way, so being away counts.
        (seen || away) &&
        !document.hidden &&
        now - lastMove > IDLE_MS
      ) {
        // The hover state is dropped rather than used to veto the act. Almost
        // everything on this site carries `data-cursor`, so refusing to idle
        // while one is hovered meant parking the pointer on any card, link or
        // button disabled the whole thing — and the reticle is about to walk
        // away from that element anyway.
        root!.classList.remove("is-wide", "is-ring", "is-pan");
        act = pickAct(now);
      }

      // The pose between acts. Excluded while a target is hovered, where the
      // widened box and its label already have a look of their own.
      root!.classList.toggle(
        "is-rest",
        !act &&
          !intro &&
          seen &&
          !root!.classList.contains("is-wide") &&
          now - lastMove > REST_MS
      );

      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      root!.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      raf = requestAnimationFrame(loop);
    }

    // Momentary squeeze on press, so clicks feel acknowledged.
    const onDown = () => {
      lastMove = performance.now();
      endAct(true);
      root.classList.add("is-down");
    };
    const onUp = () => root.classList.remove("is-down");
    /** Scrolling and typing are input too — neither moves the mouse. */
    const onWake = () => {
      lastMove = performance.now();
      endAct(true);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("wheel", onWake, { passive: true });
    window.addEventListener("keydown", onWake);
    /**
     * Three ways to notice the pointer has gone, because no single one is
     * dependable: `mouseleave` on the document misses some exits, `mouseout`
     * with a null `relatedTarget` catches leaving the viewport itself, and
     * `blur` covers switching to another window without crossing an edge.
     */
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) onLeave();
    };

    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseout", onOut);
    const onBlur = () => {
      unfocused = true;
    };
    const onFocus = () => {
      unfocused = false;
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("mouseenter", onEnter);
    /**
     * Placed at the centre and started after a beat, so the introduction does
     * not fight the boot animation on a first visit. `seen` is set here because
     * the reticle is on screen from the start now — the first real mouse move
     * must not treat itself as the first sighting and teleport the box.
     */
    const introTimer = window.setTimeout(() => {
      if (!intro) return;
      x = targetX = window.innerWidth / 2;
      y = targetY = window.innerHeight / 2;
      seen = true;
      root.classList.add("is-live");
      act = nextIntroAct(performance.now());
    }, 900);

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(introTimer);
      endAct();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("wheel", onWake);
      window.removeEventListener("keydown", onWake);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("mouseenter", onEnter);
      document.body.classList.remove("reticle-on");
    };
  }, []);

  return (
    <>
      <div className="reticle" ref={rootRef} aria-hidden="true">
        <div className="ret-box">
          <span className="ret-c tl" />
          <span className="ret-c tr" />
          <span className="ret-c bl" />
          <span className="ret-c br" />
          <span className="ret-dot" />

          {/* Inside the box on purpose: when the frame widens for TERMINAL the
              four corners end up framing the display, so the reticle becomes a
              screen rather than growing a panel next to itself. */}
          <span className="ret-screen">
            <span className="ret-lines" ref={linesRef} />
          </span>

          {/* Same idea for FACE — the brackets become the head. */}
          <span className="ret-face">
            <span className="ret-eye l" />
            <span className="ret-eye r" />
            <span className="ret-mouth" />
          </span>
        </div>
        <span className="ret-ring">
          <span className="ret-ring-inner">VIEW &middot; CASE &middot; STUDY &middot; </span>
        </span>
        <span className="ret-pan ret-pan-l">&larr;</span>
        <span className="ret-pan ret-pan-r">&rarr;</span>
        <span className="ret-read" ref={readRef}>
          000 / 000
        </span>
      </div>

      {/* Outside the reticle: the mote has to sit at its own page position
          rather than travel along with the cursor. */}
      <span className="ret-mote" ref={moteRef} aria-hidden="true" />

      {/* Where the mote comes apart when caught. Eight fragments, each given
          its own direction in CSS. */}
      <span className="ret-burst" ref={burstRef} aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="ret-frag" />
        ))}
      </span>
    </>
  );
}
