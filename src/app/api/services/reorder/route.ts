import Service from "@/models/Service";
import { reorderHandler } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

export const PATCH = reorderHandler({ model: Service, name: "services" });
