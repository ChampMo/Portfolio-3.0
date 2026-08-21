import Resume from "@/models/Resume";
import { itemHandlers } from "@/lib/api/crud";
import { normalizeResume } from "@/lib/data/normalize";
import { sanitiseResume } from "@/lib/api/sanitisers";

export const dynamic = "force-dynamic";

const handlers = itemHandlers({
  model: Resume,
  name: "resumes",
  normalise: normalizeResume,
  sanitise: sanitiseResume,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
