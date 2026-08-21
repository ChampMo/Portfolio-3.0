import { cleanList, str, bool, num } from "./respond";
import {
  EXPERIENCE_TYPES,
  PROJECT_STATUSES,
  PROJECT_BLOCK_TYPES,
  RESUME_SECTIONS,
} from "@/lib/content/constants";
import { safeUrl } from "@/lib/content/url";
import {
  PRODUCT_PLATFORMS,
  PRODUCT_STATUSES,
  DEVICE_TYPES,
} from "@/lib/content/constants";

/**
 * Each sanitiser copies only known fields off the request body. Anything not
 * listed here (including `_id`, timestamps, or injected operators) is dropped,
 * so a client can never write to a field the UI does not own.
 *
 * `undefined` values are stripped so a PATCH-style partial update does not
 * blank out fields the caller did not send.
 */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

const has = (b: Record<string, unknown>, k: string) => k in b;

export function sanitiseService(b: Record<string, unknown>) {
  return compact({
    code: has(b, "code") ? str(b.code).toUpperCase() : undefined,
    name: has(b, "name") ? str(b.name) : undefined,
    tagline: has(b, "tagline") ? str(b.tagline) : undefined,
    description: has(b, "description") ? str(b.description) : undefined,
    deliverables: has(b, "deliverables") ? cleanList(b.deliverables) : undefined,
    linkedProjectIds: has(b, "linkedProjectIds")
      ? cleanList(b.linkedProjectIds).filter((id) => /^[a-f0-9]{24}$/i.test(id))
      : undefined,
    order: has(b, "order") ? num(b.order) : undefined,
    published: has(b, "published") ? bool(b.published, true) : undefined,
  });
}

export function sanitiseExperience(b: Record<string, unknown>) {
  const type = str(b.type).toUpperCase();
  return compact({
    role: has(b, "role") ? str(b.role) : undefined,
    organization: has(b, "organization") ? str(b.organization) : undefined,
    type: has(b, "type")
      ? (EXPERIENCE_TYPES as readonly string[]).includes(type)
        ? type
        : "WORK"
      : undefined,
    time: has(b, "time") ? str(b.time) : undefined,
    location: has(b, "location") ? str(b.location) : undefined,
    summary: has(b, "summary") ? str(b.summary) : undefined,
    achievements: has(b, "achievements") ? cleanList(b.achievements) : undefined,
    stack: has(b, "stack") ? cleanList(b.stack) : undefined,
    order: has(b, "order") ? num(b.order) : undefined,
    published: has(b, "published") ? bool(b.published, true) : undefined,
  });
}

/** Lowercase, strip accents-free non-word chars, collapse dashes. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Content blocks are the one place a client sends nested structures, so each
 * one is rebuilt field by field rather than trusted wholesale. Unknown block
 * types are dropped instead of stored, since the renderer has no case for them.
 */
type SanitisedBlock = {
  id: string;
  type: string;
  content: string | { title: string; images: string[]; height: number };
};

function sanitiseBlocks(input: unknown): SanitisedBlock[] {
  if (!Array.isArray(input)) return [];

  // The explicit callback return type keeps TS from inferring a union of two
  // different array types across the gallery / non-gallery branches.
  return input.flatMap((raw): SanitisedBlock[] => {
    if (typeof raw !== "object" || raw === null) return [];
    const block = raw as Record<string, unknown>;
    const type = str(block.type);
    if (!(PROJECT_BLOCK_TYPES as readonly string[]).includes(type)) return [];

    const id = str(block.id) || `b_${Math.random().toString(36).slice(2, 10)}`;

    if (type === "gallery") {
      const c = (block.content ?? {}) as Record<string, unknown>;
      const height = num(c.height, 300);
      return [
        {
          id,
          type,
          content: {
            title: str(c.title),
            images: cleanList(c.images).map(safeUrl).filter(Boolean),
            // Clamp: the value drives an inline pixel height on the public page.
            height: Math.min(1200, Math.max(80, height)),
          },
        },
      ];
    }

    // A link block's content is rendered straight into an href.
    return [
      { id, type, content: type === "link" ? safeUrl(block.content) : str(block.content) },
    ];
  });
}

export function sanitiseProject(b: Record<string, unknown>) {
  const status = str(b.status).toUpperCase();
  const name = str(b.name);
  const rawSlug = str(b.slug);

  return compact({
    name: has(b, "name") ? name : undefined,
    codename: has(b, "codename") ? str(b.codename).toUpperCase() : undefined,
    // Fall back to a slug derived from the name so the detail page always has
    // a stable URL, even if the admin left the field blank.
    slug: has(b, "slug") || has(b, "name")
      ? slugify(rawSlug || name) || undefined
      : undefined,
    year: has(b, "year") ? str(b.year) : undefined,
    role: has(b, "role") ? str(b.role) : undefined,
    status: has(b, "status")
      ? (PROJECT_STATUSES as readonly string[]).includes(status)
        ? status
        : "DEPLOYED"
      : undefined,
    summary: has(b, "summary") ? str(b.summary) : undefined,
    description: has(b, "description") ? str(b.description) : undefined,
    stack: has(b, "stack") ? cleanList(b.stack) : undefined,
    highlights: has(b, "highlights") ? cleanList(b.highlights) : undefined,
    tags: has(b, "tags") ? cleanList(b.tags) : undefined,
    links: has(b, "links")
      ? {
          repo: safeUrl((b.links as Record<string, unknown>)?.repo),
          live: safeUrl((b.links as Record<string, unknown>)?.live),
        }
      : undefined,
    coverImage: has(b, "coverImage") ? safeUrl(b.coverImage) : undefined,
    blocks: has(b, "blocks") ? sanitiseBlocks(b.blocks) : undefined,
    featured: has(b, "featured") ? bool(b.featured) : undefined,
    order: has(b, "order") ? num(b.order) : undefined,
    published: has(b, "published") ? bool(b.published, true) : undefined,
  });
}

/** Manually entered download rows. */
function sanitiseDownloads(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null) return [];
    const d = raw as Record<string, unknown>;
    const url = safeUrl(d.url);
    if (!url) return [];
    const platform = str(d.platform).toUpperCase();
    return [
      {
        platform: (PRODUCT_PLATFORMS as readonly string[]).includes(platform)
          ? platform
          : "WINDOWS",
        label: str(d.label),
        url,
        arch: str(d.arch),
      },
    ];
  });
}

export function sanitiseProduct(b: Record<string, unknown>) {
  const name = str(b.name);
  const rawSlug = str(b.slug);
  const status = str(b.status).toUpperCase();
  const device = str(b.deviceType).toUpperCase();

  return compact({
    name: has(b, "name") ? name : undefined,
    slug:
      has(b, "slug") || has(b, "name")
        ? slugify(rawSlug || name) || undefined
        : undefined,
    tagline: has(b, "tagline") ? str(b.tagline) : undefined,
    description: has(b, "description") ? str(b.description) : undefined,
    platforms: has(b, "platforms")
      ? cleanList(b.platforms)
          .map((p) => p.toUpperCase())
          .filter((p) => (PRODUCT_PLATFORMS as readonly string[]).includes(p))
      : undefined,
    status: has(b, "status")
      ? (PRODUCT_STATUSES as readonly string[]).includes(status)
        ? status
        : "LIVE"
      : undefined,
    icon: has(b, "icon") ? safeUrl(b.icon) : undefined,
    screenshots: has(b, "screenshots")
      ? cleanList(b.screenshots).map(safeUrl).filter(Boolean)
      : undefined,
    demoVideo: has(b, "demoVideo") ? safeUrl(b.demoVideo) : undefined,
    deviceType: has(b, "deviceType")
      ? (DEVICE_TYPES as readonly string[]).includes(device)
        ? device
        : "DESKTOP"
      : undefined,
    liveUrl: has(b, "liveUrl") ? safeUrl(b.liveUrl) : undefined,
    embedLive: has(b, "embedLive") ? bool(b.embedLive) : undefined,
    // Stored as "owner/repo" whatever the admin pasted — a full GitHub URL is
    // the more natural thing to have on the clipboard.
    githubRepo: has(b, "githubRepo")
      ? str(b.githubRepo)
          .replace(/^https?:\/\/github\.com\//i, "")
          .replace(/\/+$/, "")
      : undefined,
    version: has(b, "version") ? str(b.version) : undefined,
    downloads: has(b, "downloads") ? sanitiseDownloads(b.downloads) : undefined,
    installNotes: has(b, "installNotes") ? str(b.installNotes) : undefined,
    // Deliberately NOT stripped or escaped. It is markup by design and never
    // reaches this page's DOM — it is handed to a sandboxed iframe, which is
    // what makes storing it verbatim safe. Capped so one product cannot bloat
    // the document (and the products API) without limit.
    backdropHtml: has(b, "backdropHtml")
      ? str(b.backdropHtml).slice(0, 120_000)
      : undefined,
    backdropOpacity: has(b, "backdropOpacity")
      ? Math.min(100, Math.max(0, num(b.backdropOpacity, 55)))
      : undefined,
    projectId: has(b, "projectId") ? str(b.projectId) : undefined,
    featured: has(b, "featured") ? bool(b.featured) : undefined,
    order: has(b, "order") ? num(b.order) : undefined,
    published: has(b, "published") ? bool(b.published, true) : undefined,
  });
}

/**
 * One experience or project entry on a CV sheet.
 *
 * Bullets are capped rather than merely cleaned: the whole point of these
 * sheets is fitting one page, and an entry with fifteen lines has already
 * failed at that. The cap keeps a paste-gone-wrong from silently producing a
 * three-page PDF.
 */
function cvEntry(raw: unknown): Record<string, unknown> {
  const b = (raw ?? {}) as Record<string, unknown>;
  return {
    sourceId: /^[a-f0-9]{24}$/i.test(str(b.sourceId)) ? str(b.sourceId) : "",
    title: str(b.title),
    subtitle: str(b.subtitle),
    time: str(b.time),
    bullets: cleanList(b.bullets).slice(0, 10),
    enabled: bool(b.enabled, true),
  };
}

const cvEntries = (v: unknown) =>
  (Array.isArray(v) ? v : []).slice(0, 20).map(cvEntry);

export function sanitiseResume(b: Record<string, unknown>) {
  return compact({
    name: has(b, "name") ? str(b.name) : undefined,
    headline: has(b, "headline") ? str(b.headline) : undefined,
    // `safeUrl` also fills in https:// for a bare host typed by hand.
    website: has(b, "website") ? safeUrl(b.website) : undefined,
    sections: has(b, "sections")
      ? (Array.isArray(b.sections) ? b.sections : [])
          .map((raw) => {
            const s = (raw ?? {}) as Record<string, unknown>;
            return {
              key: str(s.key),
              enabled: bool(s.enabled, true),
              order: num(s.order),
            };
          })
          // An unknown key would fail the schema enum and reject the whole save.
          .filter((s) => (RESUME_SECTIONS as readonly string[]).includes(s.key))
      : undefined,
    experience: has(b, "experience") ? cvEntries(b.experience) : undefined,
    projects: has(b, "projects") ? cvEntries(b.projects) : undefined,
    order: has(b, "order") ? num(b.order) : undefined,
  });
}
