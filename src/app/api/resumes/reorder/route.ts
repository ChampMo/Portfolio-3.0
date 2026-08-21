import Resume from "@/models/Resume";
import { reorderHandler } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

export const PATCH = reorderHandler({ model: Resume, name: "resumes" });
