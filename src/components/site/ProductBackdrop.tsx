"use client";

import { useEffect, useRef, useState } from "react";
import { backdropDocument, readPaletteVars } from "@/lib/content/backdrop";
import { useResolvedTheme } from "@/lib/site/useResolvedTheme";

/**
 * Per-product artwork, running in its own world.
 *
 * The admin writes a whole HTML document — canvas, CSS animation, whatever the
 * product deserves — and it renders behind that product's panel. The point is
 * that every unit can look like the thing it is instead of sharing one layout.
 *
 * **It is never injected into this page.** It goes into an iframe with
 * `sandbox="allow-scripts"` and, critically, *without* `allow-same-origin`,
 * which drops the frame into an opaque origin of its own. Inside it, script can
 * animate all it likes; it cannot read this document, cannot reach `/api`
 * carrying the admin's cookies, and cannot navigate the page. That matters
 * because the realistic source of these snippets is "found something nice on
 * CodePen and pasted it" — `dangerouslySetInnerHTML` here would hand any such
 * snippet the whole site.
 *
 * The frame also never takes the pointer, so it stays a backdrop rather than
 * a surface that eats clicks meant for the download button.
 */
export default function ProductBackdrop({
  html,
  opacity = 55,
}: {
  html: string;
  opacity?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const mode = useResolvedTheme();

  useEffect(() => {
    const el = ref.current;
    if (!el || !html.trim()) return;

    // Built only once the panel is actually reached: three products would
    // otherwise run three animation loops the moment the page opens.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();

        // Read off this element, not the root: it sits inside the themed
        // section and therefore inherits the product’s own palette.
        setDoc(backdropDocument(html, readPaletteVars(el)));
      },
      { threshold: 0.15 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [html]);

  /**
   * Forwards the pointer into the frame.
   *
   * The backdrop sets `pointer-events: none` so it can never steal a click,
   * which also means it never receives a mouse event of its own — a backdrop
   * that reacts to the cursor is impossible without this. Coordinates are
   * normalised to 0-1 against the frame's own box, so the document inside does
   * not have to know how big it is, and are posted on a frame budget rather
   * than per event.
   *
   * `postMessage` only ever goes outward, and only ever carries two numbers.
   * The target origin has to be "*" because a sandboxed frame without
   * `allow-same-origin` has an opaque origin that cannot be named — which is
   * exactly the property that makes it safe.
   */
  // Re-sends the palette whenever the theme flips, so the frame keeps up
  // without being rebuilt.
  useEffect(() => {
    if (!doc) return;
    const el = ref.current;
    if (!el) return;
    frameRef.current?.contentWindow?.postMessage(
      { signalPalette: readPaletteVars(el) },
      "*"
    );
  }, [doc, mode]);

  useEffect(() => {
    if (!doc) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let x = 0.5;
    let y = 0.5;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      x = (e.clientX - r.left) / r.width;
      y = (e.clientY - r.top) / r.height;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        frameRef.current?.contentWindow?.postMessage({ signalPointer: { x, y } }, "*");
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [doc]);

  if (!html.trim()) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: Math.min(100, Math.max(0, opacity)) / 100 }}
    >
      {doc ? (
        <iframe
          ref={frameRef}
          // No `allow-same-origin`: with it, the frame would share this
          // document's origin and the sandbox would be worth nothing.
          sandbox="allow-scripts"
          srcDoc={doc}
          title=""
          tabIndex={-1}
          scrolling="no"
          // The document opts out of a colour scheme; this stops the element
          // itself contributing one for the frame to inherit.
          style={{ background: "transparent", colorScheme: "normal" }}
          className="size-full border-0"
        />
      ) : null}
    </div>
  );
}
