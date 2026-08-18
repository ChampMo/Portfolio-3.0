import Experience from "@/models/Experience";
import { reorderHandler } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

export const PATCH = reorderHandler({ model: Experience, name: "experience" });
