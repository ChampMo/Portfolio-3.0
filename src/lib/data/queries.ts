import { connectToDatabase } from "@/lib/db/mongodb";
import Identity, { type IdentityDoc } from "@/models/Identity";
import Skill, { type SkillDoc } from "@/models/Skill";
import Service, { type ServiceDoc } from "@/models/Service";
import Project, { type ProjectDoc } from "@/models/Project";
import Experience, { type ExperienceDoc } from "@/models/Experience";
import Product, { type ProductDoc } from "@/models/Product";
import {
  normalizeIdentity,
  normalizeSkill,
  normalizeService,
  normalizeProject,
  normalizeExperience,
  normalizeProduct,
} from "./normalize";

/**
 * Read helpers for server components. The public site talks to Mongo directly
 * rather than fetching its own API — fewer hops, and no serialisation of a
 * request the server is already inside of.
 *
 * Every helper degrades to null/[] if the database is unreachable so a broken
 * connection renders an empty section instead of a 500 for the whole page.
 * Every document also passes through a normalizer — see normalize.ts for why
 * that is not optional.
 */

/**
 * "Published unless explicitly unpublished."
 *
 * `{ published: true }` would hide any document lacking the field entirely.
 * Mongoose only applies the schema default (`true`) when a document is written
 * through the model, so anything inserted directly into MongoDB — or written
 * before the field existed — has no `published` key and would silently vanish
 * from the site. `$ne: false` matches the schema's intent instead.
 */
const PUBLISHED = { published: { $ne: false } } as const;

function jsonSafe<T>(value: unknown): T {
  // .lean() still yields ObjectId/Date instances, which cannot cross the
  // server/client boundary. This flattens them to plain JSON values.
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getIdentity(): Promise<IdentityDoc | null> {
  try {
    await connectToDatabase();
    const doc = await Identity.findOne({ key: "main" }).lean();
    return normalizeIdentity(doc ? jsonSafe<Partial<IdentityDoc>>(doc) : null);
  } catch (err) {
    console.error("[data] getIdentity:", err);
    return null;
  }
}

export async function getSkills(): Promise<SkillDoc | null> {
  try {
    await connectToDatabase();
    const doc = await Skill.findOne({ key: "main" }).lean();
    return normalizeSkill(doc ? jsonSafe<Partial<SkillDoc>>(doc) : null);
  } catch (err) {
    console.error("[data] getSkills:", err);
    return null;
  }
}

export async function getServices(): Promise<ServiceDoc[]> {
  try {
    await connectToDatabase();
    const docs = await Service.find(PUBLISHED).sort({ order: 1 }).lean();
    return jsonSafe<Partial<ServiceDoc>[]>(docs).map(normalizeService);
  } catch (err) {
    console.error("[data] getServices:", err);
    return [];
  }
}

export async function getProjects(): Promise<ProjectDoc[]> {
  try {
    await connectToDatabase();
    const docs = await Project.find(PUBLISHED).sort({ order: 1 }).lean();
    return jsonSafe<Partial<ProjectDoc>[]>(docs).map(normalizeProject);
  } catch (err) {
    console.error("[data] getProjects:", err);
    return [];
  }
}

/**
 * The home rail shows the starred projects only, so the archive can grow
 * without the front page turning into an endless side-scroll.
 *
 * Falling back to the full list when nothing is starred is deliberate: an
 * empty rail on the home page reads as a bug, and every project was on show
 * before this filter existed — a site with no stars set should look unchanged.
 */
export function pickFeatured(projects: ProjectDoc[]): ProjectDoc[] {
  const starred = projects.filter((p) => p.featured);
  return starred.length > 0 ? starred : projects;
}

export async function getProjectBySlug(slug: string): Promise<ProjectDoc | null> {
  try {
    await connectToDatabase();
    const doc = await Project.findOne({ slug, ...PUBLISHED }).lean();
    return doc ? normalizeProject(jsonSafe<Partial<ProjectDoc>>(doc)) : null;
  } catch (err) {
    console.error("[data] getProjectBySlug:", err);
    return null;
  }
}

export async function getProducts(): Promise<ProductDoc[]> {
  try {
    await connectToDatabase();
    const docs = await Product.find(PUBLISHED).sort({ order: 1 }).lean();
    return jsonSafe<Partial<ProductDoc>[]>(docs).map(normalizeProduct);
  } catch (err) {
    console.error("[data] getProducts:", err);
    return [];
  }
}

export async function getExperience(): Promise<ExperienceDoc[]> {
  try {
    await connectToDatabase();
    const docs = await Experience.find(PUBLISHED).sort({ order: 1 }).lean();
    return jsonSafe<Partial<ExperienceDoc>[]>(docs).map(normalizeExperience);
  } catch (err) {
    console.error("[data] getExperience:", err);
    return [];
  }
}

/** Single round-trip for the home page. */
export async function getSiteData() {
  const [identity, skills, services, projects, experience] = await Promise.all([
    getIdentity(),
    getSkills(),
    getServices(),
    getProjects(),
    getExperience(),
  ]);
  return { identity, skills, services, projects, experience };
}
