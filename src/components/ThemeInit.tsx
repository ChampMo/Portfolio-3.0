export const THEME_STORAGE_KEY = "signal-theme";

/**
 * Sets the `.dark` / `.light` class on <html> before first paint, from the
 * stored preference. With no stored value no class is added and the
 * `prefers-color-scheme` query in globals.css decides — the "system" state.
 *
 * ── Why a raw <script> and not `next/script` ──
 * This used `<Script strategy="beforeInteractive">`, which in the App Router
 * puts nothing in the document head. Next serialises the code into a
 * `self.__next_s` queue that its client runtime drains *after the framework
 * bundle has loaded and run*, so every cold load went:
 *
 *   1. HTML paints with no theme class
 *   2. globals.css is dark-first, so the page is black
 *   3. the bundle boots, the queue drains, `.light` is finally added
 *   4. the page flips
 *
 * On a desktop that is a blink. On a phone — slower to boot the bundle, and
 * slower again on routes that stream behind a Suspense boundary — step 2
 * lasts long enough to read as "it reloaded in the wrong theme".
 *
 * Rendered into the initial HTML instead, the browser runs it while parsing,
 * before it has painted anything below. No queue, no bundle, no flash. It sits
 * as the first child of <body> because the App Router owns <head>.
 *
 * Only the first document load needs this: a client-side navigation keeps the
 * same <html> element, so the class it set is still there.
 */
export default function ThemeInit() {
  const code = `(function(){try{
    var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var r=document.documentElement;
    r.classList.remove('light','dark');
    if(t==='light'||t==='dark')r.classList.add(t);
  }catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
