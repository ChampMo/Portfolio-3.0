"use client";

import { useEffect } from "react";

/**
 * One rAF loop drives every scroll-linked layer on the page.
 *
 * The hard rule: `render()` never reads layout. All geometry is measured in
 * `measure()` (on mount, resize, and font load) and cached. Interleaving reads
 * and writes in the loop causes forced synchronous layout on every frame and
 * the whole page judders once several layers are active.
 *
 * Elements opt in with data attributes:
 *   data-px="0.12"   vertical drift, relative to distance from viewport centre
 *   data-mq="1"      marquee track; sign sets direction, scroll velocity feeds it
 */
type PxItem = { el: HTMLElement; sp: number; top: number; h: number };
type MqItem = { el: HTMLElement; dir: number; x: number; half: number };

export default function ParallaxProvider() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pxItems: PxItem[] = Array.from(
      document.querySelectorAll<HTMLElement>("[data-px]")
    ).map((el) => ({ el, sp: parseFloat(el.dataset.px || "0"), top: 0, h: 0 }));

    const mqItems: MqItem[] = Array.from(
      document.querySelectorAll<HTMLElement>("[data-mq]")
    ).map((el) => ({ el, dir: parseFloat(el.dataset.mq || "1"), x: 0, half: 0 }));

    const hero = document.getElementById("hero");
    const heroGrid = document.getElementById("hero-grid");
    const heroContent = document.getElementById("hero-content");
    const heroTel = document.getElementById("hero-telemetry");
    const nameA = document.getElementById("hero-name-a");
    const nameB = document.getElementById("hero-name-b");
    const progressBar = document.getElementById("scroll-progress");

    function measure() {
      const y = window.scrollY;
      for (const it of pxItems) {
        it.el.style.transform = "";
        const r = it.el.getBoundingClientRect();
        it.top = r.top + y;
        it.h = r.height;
      }
      for (const it of mqItems) {
        const first = it.el.firstElementChild as HTMLElement | null;
        it.half = first ? first.offsetWidth + 38 : 0;
      }
    }

    let lastY = window.scrollY;
    let vel = 0;
    let raf = 0;

    function render() {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const dy = y - lastY;
      lastY = y;
      vel += (dy - vel) * 0.25;

      if (progressBar) {
        const doc = document.documentElement.scrollHeight - vh;
        progressBar.style.width = `${doc > 0 ? (y / doc) * 100 : 0}%`;
      }

      if (!reduce) {
        // Hero exit: layers separate as the page slides over the pinned hero.
        const hp = Math.min(1, y / Math.max(1, vh));
        if (heroGrid) {
          heroGrid.style.transform = `translateY(${hp * vh * 0.32}px) scale(${1 + hp * 0.16})`;
        }
        if (heroTel) {
          heroTel.style.transform = `translateY(${-50 - hp * 55}%) translateX(${-hp * 70}px)`;
          heroTel.style.opacity = `${Math.max(0, 1 - hp * 1.6)}`;
        }
        if (heroContent) {
          heroContent.style.transform = `translateY(${-hp * 70}px) scale(${1 - hp * 0.05})`;
          heroContent.style.opacity = `${Math.max(0, 1 - hp * 1.25)}`;
        }
        if (nameA) nameA.style.transform = `translateX(${-hp * 190}px)`;
        if (nameB) nameB.style.transform = `translateX(${hp * 190}px)`;
        if (hero) {
          hero.style.filter = hp > 0.02 ? `blur(${hp * 4}px)` : "";
          hero.style.visibility = hp >= 1 ? "hidden" : "";
        }

        for (const it of pxItems) {
          const mid = it.top + it.h / 2;
          const rel = (y + vh / 2 - mid) / vh;
          if (rel < -1.4 || rel > 1.4) continue;
          it.el.style.transform = `translateY(${rel * it.sp * -170}px)`;
        }
      }

      for (const it of mqItems) {
        if (!it.half) continue;

        // Idle drift, sped up by how fast the page is moving and dragged a
        // little in its direction.
        let dx = (0.45 + Math.abs(vel) * 0.3) * it.dir + vel * 0.6 * it.dir;

        // Capped at half a wrap per frame. Without this a hard flick moved the
        // track further than one copy's width in a single step, and the old
        // single-shift wrap could not catch up — which tore a blank gap open
        // in the middle of the row.
        const cap = it.half * 0.5;
        dx = Math.max(-cap, Math.min(cap, dx));
        it.x -= dx;

        // Modulo rather than one add/subtract, so any overshoot lands back in
        // range on the same frame instead of over the following several.
        it.x %= it.half;
        if (it.x > 0) it.x -= it.half;

        it.el.style.transform = `translateX(${it.x}px)`;
      }

      raf = requestAnimationFrame(render);
    }

    measure();
    raf = requestAnimationFrame(render);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
