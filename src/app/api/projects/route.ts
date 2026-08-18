import Project from "@/models/Project";
import { listHandler, createHandler } from "@/lib/api/crud";
import { normalizeProject } from "@/lib/data/normalize";
import { sanitiseProject } from "@/lib/api/sanitisers";
import { uniqueSlug } from "@/lib/api/uniqueSlug";

export const dynamic = "force-dynamic";

const resource = {
  model: Project,
  name: "projects",
  normalise: normalizeProject,
  sanitise: sanitiseProject,
  // `slug` carries a unique index, and every new project starts life with the
  // same default name — so without this, creating a second one fails with a
  // raw E11000. Resolve a free slug before insert instead.
  prepare: async (fields: Record<string, unknown>, model: typeof Project) => {
    const base = typeof fields.slug === "string" && fields.slug ? fields.slug : "project";
    fields.slug = await uniqueSlug(model, base);
  },
};

export const GET = listHandler(resource);
export const POST = createHandler(resource);
