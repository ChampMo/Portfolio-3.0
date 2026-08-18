import Script from "next/script";

export const THEME_STORAGE_KEY = "signal-theme";

/**
 * Sets the `.dark` / `.light` class on <html> before first paint, based on a
 * stored preference. Absent a stored value, no class is added and the
 * existing `prefers-color-scheme` media query in globals.css decides — that
 * is the "system" state.
 *
 * Must run with `beforeInteractive`: a useEffect in a normal client component
 * only fires after hydration, which is one paint too late and produces a
 * visible flash of the wrong theme on every load.
 */
export default function ThemeInit() {
  const code = `(function(){try{
    var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var r=document.documentElement;
    r.classList.remove('light','dark');
    if(t==='light'||t==='dark')r.classList.add(t);
  }catch(e){}})();`;

  return <Script id="theme-init" strategy="beforeInteractive">{code}</Script>;
}
