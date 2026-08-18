import Service from "@/models/Service";
import { itemHandlers } from "@/lib/api/crud";
import { normalizeService } from "@/lib/data/normalize";
import { sanitiseService } from "@/lib/api/sanitisers";

export const dynamic = "force-dynamic";

const handlers = itemHandlers({
  model: Service,
  name: "services",
  normalise: normalizeService,
  sanitise: sanitiseService,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
