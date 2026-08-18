import { connectToDatabase } from "@/lib/db/mongodb";
import Project, { type ProjectDoc } from "@/models/Project";
import { normalizeProject } from "@/lib/data/normalize";
import ProjectsEditor from "@/components/admin/ProjectsEditor";

export const dynamic = "force-dynamic";

async function all(): Promise<ProjectDoc[]> {
  try {
    await connectToDatabase();
    const docs = await Project.find({}).sort({ order: 1 }).lean();
    const parsed = JSON.parse(JSON.stringify(docs)) as Partial<ProjectDoc>[];
    return parsed.map(normalizeProject);
  } catch {
    return [];
  }
}

export default async function Page() {
  return <ProjectsEditor initial={await all()} />;
}
