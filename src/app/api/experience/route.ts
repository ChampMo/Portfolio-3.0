import Experience from "@/models/Experience";
import { listHandler, createHandler } from "@/lib/api/crud";
import { normalizeExperience } from "@/lib/data/normalize";
import { sanitiseExperience } from "@/lib/api/sanitisers";

export const dynamic = "force-dynamic";

const resource = {
  model: Experience,
  name: "experience",
  normalise: normalizeExperience, sanitise: sanitiseExperience,
};

export const GET = listHandler(resource);
export const POST = createHandler(resource);
