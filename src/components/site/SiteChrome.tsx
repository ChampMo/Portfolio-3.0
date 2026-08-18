"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { slideTo } from "./SlideTransition";

const SECTIONS = [
  { id: "about", idx: "01", label: "IDENTITY" },
  { id: "skills", idx: "02", label: "FORGE" },
  { id: "services", idx: "03", label: "SERVICE" },
  { id: "work", idx: "04", label: "ARCHIVE" },
  { id: "log", idx: "05", label: "LOG" },
  { id: "contact", idx: "06", label: "CONTACT" },
];

const NAV = [
  { href: "#about", label: "About" },
  { href: "#skills", label: "Skills" },
  { href: "#work", label: "Work" },
  { href: "/products", label: "Products" },
  { href: "#log", label: "Log" },
  { href: "#contact", label: "Contact" },
];

export default function SiteChrome({ initials }: { initials: string }) {
  const [current, setCurrent] = useState("01");
  const [docked, setDocked] = useState(false);
  const [showWaypoints, setShowWaypoints] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setDocked(window.scrollY > 40);
      setShowWaypoints(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // A thin band across the viewport middle is far more reliable than a
    // ratio threshold here: the project rail is several viewports tall, so no
    // single threshold works for both it and the short sections.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const hit = SECTIONS.find((s) => s.id === e.target.id);
          if (hit) setCurrent(hit.idx);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[60] h-0.5">
        <div id="scroll-progress" className="h-full w-0 bg-signal" />
      </div>

      <header
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-[var(--pad-x)] py-[22px] font-mono backdrop-blur-[10px] transition-colors ${
          docked ? "border-grid" : "border-transparent"
        }`}
        style={{ background: "color-mix(in srgb, var(--ground) 82%, transparent)" }}
      >
        <div className="text-[13px] tracking-[0.12em] tabular-nums">
          {initials} <span className="text-telemetry">/ {current}</span>
        </div>
        <div className="flex items-center gap-5 sm:gap-7">
          <nav className="flex gap-4 sm:gap-[26px]">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                data-cursor="GO"
                onClick={(e) => {
                  // Hash links stay as they are; only the route entries get
                  // the wipe, so the horizontal move belongs to leaving the
                  // page rather than to jumping within it.
                  if (n.href.startsWith("#")) return;
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  slideTo(n.href, "right");
                }}
                className="text-[11px] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-ink"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <aside
        aria-hidden="true"
        className={`fixed right-6 top-1/2 z-[45] hidden -translate-y-1/2 flex-col items-end gap-3 transition-opacity duration-500 lg:flex ${
          showWaypoints ? "opacity-100" : "opacity-0"
        }`}
      >
        {SECTIONS.map((s) => {
          const on = s.idx === current;
          return (
            <div key={s.id} className="flex items-center gap-2 font-mono text-[9px] tracking-[0.14em]">
              <span className={`transition-opacity ${on ? "text-signal opacity-100" : "opacity-0"}`}>
                {s.label}
              </span>
              <span
                className={`block h-px transition-all ${on ? "w-7 bg-signal" : "w-3.5 bg-grid"}`}
              />
            </div>
          );
        })}
      </aside>
    </>
  );
}
