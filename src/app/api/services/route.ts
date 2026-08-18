import Service from "@/models/Service";
import { listHandler, createHandler } from "@/lib/api/crud";
import { normalizeService } from "@/lib/data/normalize";
import { sanitiseService } from "@/lib/api/sanitisers";

export const dynamic = "force-dynamic";

const resource = { model: Service, name: "services", normalise: normalizeService, sanitise: sanitiseService };

export const GET = listHandler(resource);
export const POST = createHandler(resource);
