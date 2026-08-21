import type { IdentityDoc } from "@/models/Identity";
import type { SkillDoc } from "@/models/Skill";
import type { ServiceDoc } from "@/models/Service";
import type { ProjectDoc } from "@/models/Project";
import type { ProductDoc, ProductDownload } from "@/models/Product";
import type { ExperienceDoc } from "@/models/Experience";
import type { ResumeDoc, ResumeEntry } from "@/models/Resume";
import { RESUME_SECTIONS } from "@/lib/content/constants";

/**
 * `.lean()` returns exactly what is stored in MongoDB — Mongoose only applies
 * schema defaults when a document is hydrated (`new Model()` / `.create()`),
 * never on read. Any document written before a field existed (or written
 * directly against the DB, or left over from a differently-shaped collection
 * of the same name) comes back with that field simply absent.
 *
 * The site and the admin editors call `.length` / `.map` on array fields
 * (`deliverables`, `stack`, `achievements`, `highlights`, `tags`) without
 * guarding, so a missing field throws instead of rendering empty. These
 * normalizers are the single place that backfills defaults for whatever a
 * raw read returns, so every consumer can trust the shape.
 */

const arr = (v: unknown): string[] => (Array.isArray(v) ? v : []);
const text = (v: unknown): string => (typeof v === "string" ? v : "");
const flag = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;
const number = (v: unknown, fallback: number): number =>
  typeof v === "number" ? v : fallback;

export function normalizeService(raw: Partial<ServiceDoc>): ServiceDoc {
  return {
    _id: text(raw._id),
    code: text(raw.code),
    name: text(raw.name),
    tagline: text(raw.tagline),
    description: text(raw.description),
    deliverables: arr(raw.deliverables),
    linkedProjectIds: arr(raw.linkedProjectIds),
    order: number(raw.order, 0),
    published: flag(raw.published, true),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

export function normalizeExperience(raw: Partial<ExperienceDoc>): ExperienceDoc {
  return {
    _id: text(raw._id),
    role: text(raw.role),
    organization: text(raw.organization),
    type: (raw.type as ExperienceDoc["type"]) || "WORK",
    time: text(raw.time),
    location: text(raw.location),
    summary: text(raw.summary),
    achievements: arr(raw.achievements),
    stack: arr(raw.stack),
    order: number(raw.order, 0),
    published: flag(raw.published, true),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

export function normalizeProject(raw: Partial<ProjectDoc>): ProjectDoc {
  return {
    _id: text(raw._id),
    name: text(raw.name),
    codename: text(raw.codename),
    slug: raw.slug ? text(raw.slug) : undefined,
    year: text(raw.year),
    role: text(raw.role),
    status: (raw.status as ProjectDoc["status"]) || "DEPLOYED",
    summary: text(raw.summary),
    description: text(raw.description),
    stack: arr(raw.stack),
    highlights: arr(raw.highlights),
    tags: arr(raw.tags),
    links: { repo: text(raw.links?.repo), live: text(raw.links?.live) },
    coverImage: text(raw.coverImage),
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
    views: number(raw.views, 0),
    featured: flag(raw.featured, false),
    order: number(raw.order, 0),
    published: flag(raw.published, true),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

export function normalizeProduct(raw: Partial<ProductDoc>): ProductDoc {
  return {
    _id: text(raw._id),
    name: text(raw.name),
    slug: raw.slug ? text(raw.slug) : undefined,
    tagline: text(raw.tagline),
    description: text(raw.description),
    platforms: arr(raw.platforms) as ProductDoc["platforms"],
    status: (raw.status as ProductDoc["status"]) || "LIVE",
    icon: text(raw.icon),
    screenshots: arr(raw.screenshots),
    demoVideo: text(raw.demoVideo),
    deviceType: (raw.deviceType as ProductDoc["deviceType"]) || "DESKTOP",
    liveUrl: text(raw.liveUrl),
    embedLive: flag(raw.embedLive, false),
    githubRepo: text(raw.githubRepo),
    version: text(raw.version),
    downloads: Array.isArray(raw.downloads)
      ? (raw.downloads as ProductDownload[]).map((d) => ({
          platform: (d?.platform as ProductDownload["platform"]) || "WINDOWS",
          label: text(d?.label),
          url: text(d?.url),
          arch: text(d?.arch),
        }))
      : [],
    installNotes: text(raw.installNotes),
    backdropHtml: text(raw.backdropHtml),
    backdropOpacity: number(raw.backdropOpacity, 55),
    projectId: text(raw.projectId),
    featured: flag(raw.featured, false),
    order: number(raw.order, 0),
    published: flag(raw.published, true),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
  };
}

export function normalizeSkill(raw: Partial<SkillDoc> | null): SkillDoc | null {
  if (!raw) return null;
  return {
    _id: text(raw._id),
    key: text(raw.key) || "main",
    categories: Array.isArray(raw.categories)
      ? raw.categories.map((c, i) => ({
          name: text(c?.name),
          items: arr(c?.items),
          order: number(c?.order, i),
        }))
      : [],
  };
}

export function normalizeIdentity(raw: Partial<IdentityDoc> | null): IdentityDoc | null {
  if (!raw) return null;
  const sec = raw.sections;
  const section = (key: keyof IdentityDoc["sections"], eyebrow: string) => ({
    eyebrow: text(sec?.[key]?.eyebrow) || eyebrow,
    lead: text(sec?.[key]?.lead),
    body: text(sec?.[key]?.body),
  });

  return {
    _id: text(raw._id),
    key: text(raw.key) || "main",
    profile: {
      firstName: text(raw.profile?.firstName),
      lastName: text(raw.profile?.lastName),
      nickname: text(raw.profile?.nickname),
      role: text(raw.profile?.role),
      motto: text(raw.profile?.motto),
      intro: text(raw.profile?.intro),
    },
    availability: {
      isOpen: flag(raw.availability?.isOpen, true),
      label: text(raw.availability?.label) || "Open to work",
    },
    contact: {
      phone: text(raw.contact?.phone),
      email: text(raw.contact?.email),
      address: text(raw.contact?.address),
      latitude: text(raw.contact?.latitude) || "13.7563",
      longitude: text(raw.contact?.longitude) || "100.5018",
      timezone: text(raw.contact?.timezone) || "Asia/Bangkok",
    },
    socials: {
      github: text(raw.socials?.github),
      linkedin: text(raw.socials?.linkedin),
      instagram: text(raw.socials?.instagram),
      facebook: text(raw.socials?.facebook),
    },
    education: {
      universityName: text(raw.education?.universityName),
      universityShort: text(raw.education?.universityShort),
      universityLogo: text(raw.education?.universityLogo),
      major: text(raw.education?.major),
      timelineStart: text(raw.education?.timelineStart),
      timelineEnd: text(raw.education?.timelineEnd),
      gpax: text(raw.education?.gpax),
      honours: text(raw.education?.honours),
    },
    media: {
      avatar: text(raw.media?.avatar),
      slideshowImages: arr(raw.media?.slideshowImages),
      cvUrl: text(raw.media?.cvUrl),
      cvVisible: flag(raw.media?.cvVisible, true),
      transcriptUrl: text(raw.media?.transcriptUrl),
      transcriptVisible: flag(raw.media?.transcriptVisible, true),
    },
    sections: {
      about: section("about", "Identity"),
      skills: section("skills", "Tech Forge"),
      services: section("services", "Service Bay"),
      projects: section("projects", "Mission Archives"),
      experience: section("experience", "Mission Log"),
      contact: section("contact", "Channel Open"),
    },
  };
}

/**
 * A CV sheet, with every field guaranteed present.
 *
 * `sections` is filled in from the canonical list rather than trusted from the
 * document: a sheet saved before a section existed would otherwise be missing
 * it entirely, and the editor would have no row to toggle. Order comes from
 * the stored row where there is one, and from the canonical order otherwise.
 */
export function normalizeResume(raw: Partial<ResumeDoc> & { _id?: unknown }): ResumeDoc {
  const stored = new Map(
    (Array.isArray(raw?.sections) ? raw.sections : []).map((s) => [s?.key, s])
  );

  const entries = (v: unknown): ResumeEntry[] =>
    (Array.isArray(v) ? v : []).map((raw) => {
      const e = (raw ?? {}) as Partial<ResumeEntry>;
      return {
        sourceId: text(e.sourceId),
        title: text(e.title),
        subtitle: text(e.subtitle),
        time: text(e.time),
        bullets: arr(e.bullets),
        enabled: e.enabled !== false,
      };
    });

  return {
    _id: String(raw?._id ?? ""),
    name: text(raw?.name),
    headline: text(raw?.headline),
    website: text(raw?.website),
    sections: RESUME_SECTIONS.map((key, i) => {
      const hit = stored.get(key);
      return {
        key,
        // Services is the one section a CV does not usually carry, so a sheet
        // that has never been told either way leaves it out.
        enabled: hit ? hit.enabled !== false : key !== "services",
        order: hit && typeof hit.order === "number" ? hit.order : i,
      };
    }).sort((a, b) => a.order - b.order),
    experience: entries(raw?.experience),
    projects: entries(raw?.projects),
    order: number(raw?.order, 0),
  };
}
