"use client";

import { useEffect, useRef } from "react";

/**
 * Reveals a heading character by character when it scrolls into view.
 *
 * Text is split into words first, then characters inside each word. Splitting
 * straight to characters would make every letter its own inline-block and the
 * line could then break mid-word.
 *
 * The visible characters are `aria-hidden`; the real string is exposed once on
 * the wrapper, so assistive tech reads a normal heading rather than a column
 * of single letters.
 */
export default function SplitText({
  text,
  className,
  /** Seconds added per character. */
  step = 0.022,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  step?: number;
  as?: "span" | "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("split-in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("split-in");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = text.split(" ");
  let charIndex = 0;

  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement & HTMLSpanElement>}
      className={className}
      aria-label={text}
    >
      {words.map((word, w) => (
        <span key={`${word}-${w}`} aria-hidden="true">
          <span className="split-word">
            {word.split("").map((ch, c) => {
              const delay = (charIndex++ * step).toFixed(3);
              return (
                <span
                  key={`${ch}-${c}`}
                  className="split-char"
                  style={{ ["--d" as string]: `${delay}s` }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
