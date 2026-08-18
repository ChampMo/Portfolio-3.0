import Project from "@/models/Project";
import { itemHandlers } from "@/lib/api/crud";
import { normalizeProject } from "@/lib/data/normalize";
import { sanitiseProject } from "@/lib/api/sanitisers";

export const dynamic = "force-dynamic";

const handlers = itemHandlers({
  model: Project,
  name: "projects",
  normalise: normalizeProject,
  sanitise: sanitiseProject,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
