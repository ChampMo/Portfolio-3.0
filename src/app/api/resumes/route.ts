import Resume from "@/models/Resume";
import { listHandler, createHandler } from "@/lib/api/crud";
import { normalizeResume } from "@/lib/data/normalize";
import { sanitiseResume } from "@/lib/api/sanitisers";

export const dynamic = "force-dynamic";

const resource = {
  model: Resume,
  name: "resumes",
  normalise: normalizeResume,
  sanitise: sanitiseResume,
};

export const GET = listHandler(resource);
export const POST = createHandler(resource);
