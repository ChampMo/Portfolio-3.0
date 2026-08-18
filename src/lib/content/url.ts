/**
 * Scheme allowlist for anything that ends up in an `href` or `src`.
 *
 * Every URL on this site is typed into the admin by hand, so nothing here
 * defends against an anonymous attacker. It defends against the two things
 * that actually happen: a link pasted from somewhere untrusted, and an admin
 * session that has been taken over. A stored `javascript:` URL executes in
 * every visitor's browser the moment they click it, and costs three lines to
 * make impossible.
 *
 * Lives under `content/` rather than `api/` because both the write path
 * (sanitisers) and the render path (components, some of them client-side)
 * import it — and anything a client component touches must never pull in
 * mongoose.
 */
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/** A bare host someone typed without a scheme, e.g. "github.com/champ". */
const BARE_HOST = /^[\w-]+(\.[\w-]+)+([/?#].*)?$/i;

export function safeUrl(input: unknown): string {
  const s = typeof input === "string" ? input.trim() : "";
  if (!s) return "";

  // Site-relative paths are fine; protocol-relative ("//evil.com") is not,
  // because it inherits the scheme and leaves the site.
  if (s.startsWith("/")) return s.startsWith("//") ? "" : s;

  try {
    const url = new URL(s);
    return SAFE_PROTOCOLS.has(url.protocol) ? s : "";
  } catch {
    // Not parseable as absolute. Assume https for a plain host so the admin
    // does not have to remember the prefix; reject anything else.
    return BARE_HOST.test(s) ? `https://${s}` : "";
  }
}

/** For render sites: returns undefined so the attribute is dropped entirely. */
export function safeHref(input: unknown): string | undefined {
  return safeUrl(input) || undefined;
}

/** Ids are always eleven characters of the URL-safe alphabet. */
const YOUTUBE_ID = /^[\w-]{11}$/;

/**
 * The video id inside any of the shapes YouTube hands out — the address bar
 * (`watch?v=`), the share button (`youtu.be/`), an embed, or a Short.
 *
 * A YouTube page URL in a `<video src>` renders a blank frame, which is what
 * anyone pasting one straight from the address bar would have got. Reading the
 * id here means the field accepts what people actually have to hand, and turns
 * it into the embed that plays.
 */
export function youtubeId(input: unknown): string {
  const s = typeof input === "string" ? input.trim() : "";
  if (!s) return "";

  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return YOUTUBE_ID.test(id) ? id : "";
    }

    if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") {
      return "";
    }

    const v = url.searchParams.get("v");
    if (v && YOUTUBE_ID.test(v)) return v;

    // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    return parts.length > 1 && YOUTUBE_ID.test(last) ? last : "";
  } catch {
    return "";
  }
}

/**
 * Player URL for an id — muted and looping, so it behaves like the silent
 * background clip this frame was built around rather than starting a
 * performance at the visitor.
 *
 * `youtube-nocookie.com` because nobody asked to be tracked for looking at a
 * screenshot. The loop needs `playlist` set to the same id: YouTube ignores
 * `loop=1` on a single video without it.
 */
export function youtubeEmbed(id: string): string {
  const q = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: id,
    controls: "0",
    modestbranding: "1",
    rel: "0",
    // No annotation cards floating over the product's screen either.
    iv_load_policy: "3",
    playsinline: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${q.toString()}`;
}
