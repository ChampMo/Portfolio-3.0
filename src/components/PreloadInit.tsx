import Script from "next/script";

export const PRELOAD_SESSION_KEY = "signal-booted";

/**
 * Decides — before the browser paints — whether the home page's preloader
 * curtain should run, and stamps `data-preload="1"` on <html> if so.
 *
 * Why `next/script` in the root layout rather than a plain <script> in the
 * page: a script tag rendered inside a React component only executes when the
 * browser parses it in the initial HTML. On a client-side navigation React
 * re-renders that component and inserts the tag via the DOM, where scripts are
 * never executed — React logs "Encountered a script tag while rendering React
 * component" and the flag silently stops working. `beforeInteractive` scripts
 * belong to the document, run once, and are never re-inserted.
 *
 * Living in the root layout means it runs for every route, so the pathname
 * guard keeps the scroll lock and the curtain scoped to the home page — any
 * other route would have no Preloader mounted to clear the flag again.
 *
 * Skipped on repeat views within a session and under prefers-reduced-motion.
 * With JS disabled the flag is never set, so the page renders with no curtain.
 */
export default function PreloadInit() {
  const code = `(function(){try{
    if (location.pathname !== '/') return;
    if (sessionStorage.getItem(${JSON.stringify(PRELOAD_SESSION_KEY)}) === '1') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sessionStorage.setItem(${JSON.stringify(PRELOAD_SESSION_KEY)},'1');
    document.documentElement.setAttribute('data-preload','1');
  }catch(e){}})();`;

  return (
    <Script id="preload-init" strategy="beforeInteractive">
      {code}
    </Script>
  );
}
