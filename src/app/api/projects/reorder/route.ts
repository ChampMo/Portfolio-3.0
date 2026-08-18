import Project from "@/models/Project";
import { reorderHandler } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

export const PATCH = reorderHandler({ model: Project, name: "projects" });
