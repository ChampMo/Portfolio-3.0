/** Palette handed to a backdrop so it can match the site without guessing. */
export const BACKDROP_TOKENS = [
  "ground",
  "panel",
  "panel-2",
  "grid",
  "ink",
  "ink-muted",
  "signal",
  "telemetry",
] as const;

/**
 * Wraps a backdrop snippet in the document it actually runs in.
 *
 * Shared by the public deck and the admin preview on purpose. They diverged
 * once — the preview omitted the palette — and every colour in a backdrop is
 * written as `color-mix(... var(--signal) ...)`. A missing variable makes the
 * whole `color-mix` invalid, which makes the declaration invalid, which makes
 * the element paint nothing. The result was a preview that showed an empty box
 * for a document that was perfectly fine.
 */
export function backdropDocument(body: string, vars: string): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
    // `color-scheme: normal` is load-bearing. The site declares a scheme on
    // its own :root, and a frame that resolves to a concrete light or dark
    // scheme gets an *opaque* canvas painted by the browser — white here —
    // which `background: transparent` cannot undo, because a transparent root
    // is exactly the case where the UA canvas colour shows through. Opting out
    // of the scheme is what leaves the frame see-through.
    `:root{color-scheme:normal;${vars}}` +
    "html,body{margin:0;height:100%;overflow:hidden;background:transparent}" +
    "*{box-sizing:border-box}" +
    "</style>" +
    // Applies palette updates posted in from the parent. Without it the frame
    // keeps whatever colours it was built with, and a backdrop written against
    // `var(--ink)` turns invisible the moment the theme flips — light dots on
    // a light ground. Re-creating the document instead would work, but it
    // would also restart every animation inside it on each toggle.
    "<script>addEventListener('message',function(e){" +
    "var p=e.data&&e.data.signalPalette;" +
    "if(typeof p==='string')document.documentElement.style.cssText=p;" +
    "});<\/script>" +
    "</head><body>" +
    body +
    "</body></html>"
  );
}

/**
 * Reads the palette that actually applies at `from`, defaulting to the root.
 *
 * The element matters. A product panel overrides these tokens on itself, so
 * reading the document root would hand the frame the *site's* colours and
 * ignore the product's own theme entirely — which is a second way for a
 * backdrop to come out invisible.
 */
export function readPaletteVars(from?: Element | null): string {
  const css = getComputedStyle(from ?? document.documentElement);
  return BACKDROP_TOKENS.map(
    (t) => `--${t}:${css.getPropertyValue(`--${t}`).trim()};`
  ).join("");
}


/* ─────────────────────── panel theme ───────────────────────
 *
 * A backdrop document may also declare the palette for the panel in front of
 * it, so one file carries a product's whole look:
 *
 *   <script type="application/json" id="signal-theme">
 *   { "dark": { "ground": "#0b1020", "signal": "#4da3ff" },
 *     "light": { "ground": "#ffffff", "signal": "#2b8fe0" } }
 *   </script>
 *
 * The block is *extracted with a regex and parsed as JSON* — never executed,
 * and never handed to the page as markup. Only names on the allowlist below
 * survive, and every value has to match a colour or font-stack pattern. That
 * matters: these end up in a style attribute, so a value containing `;` could
 * otherwise close the declaration and start writing arbitrary CSS.
 */

const COLOUR_TOKENS = [
  "ground",
  "panel",
  "panel-2",
  "grid",
  "ink",
  "ink-muted",
  "signal",
  "on-signal",
  "telemetry",
] as const;

/** Next/font variables the panel's `font-display` / `font-mono` resolve to. */
const FONT_TOKENS: Record<string, string> = {
  "font-display": "--font-big-shoulders",
  "font-body": "--font-public-sans",
  "font-mono": "--font-jetbrains-mono",
};

const COLOUR_RE =
  /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([0-9a-z%.,\s/+-]{1,60}\)|[a-z]{3,20})$/i;
const FONT_RE = /^[\w\s,'"-]{1,120}$/;

export type PanelTheme = Record<string, string>;

/** Pulls the `signal-theme` block out of a backdrop document, if it has one. */
export function extractTheme(html: string): { light: PanelTheme; dark: PanelTheme } {
  const empty = { light: {}, dark: {} };
  if (!html.includes("signal-theme")) return empty;

  const match = html.match(
    /<script[^>]*id=["']signal-theme["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return empty;
  }
  if (typeof parsed !== "object" || parsed === null) return empty;

  const obj = parsed as Record<string, unknown>;
  // A flat object applies to both modes; `light` / `dark` keys split them.
  const hasModes = "light" in obj || "dark" in obj;

  return {
    light: cleanTheme(hasModes ? obj.light : obj),
    dark: cleanTheme(hasModes ? obj.dark : obj),
  };
}

function cleanTheme(input: unknown): PanelTheme {
  if (typeof input !== "object" || input === null) return {};
  const out: PanelTheme = {};

  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (typeof rawValue !== "string") continue;
    const value = rawValue.trim();
    const key = rawKey.trim().toLowerCase();

    if ((COLOUR_TOKENS as readonly string[]).includes(key)) {
      if (COLOUR_RE.test(value)) out[`--${key}`] = value;
      continue;
    }

    const fontVar = FONT_TOKENS[key];
    if (fontVar && FONT_RE.test(value)) out[fontVar] = value;
  }

  return out;
}
