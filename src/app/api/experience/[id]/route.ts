import Experience from "@/models/Experience";
import { itemHandlers } from "@/lib/api/crud";
import { normalizeExperience } from "@/lib/data/normalize";
import { sanitiseExperience } from "@/lib/api/sanitisers";

export const dynamic = "force-dynamic";

const handlers = itemHandlers({
  model: Experience,
  name: "experience",
  normalise: normalizeExperience,
  sanitise: sanitiseExperience,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
