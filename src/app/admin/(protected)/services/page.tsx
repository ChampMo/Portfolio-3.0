import { connectToDatabase } from "@/lib/db/mongodb";
import Service, { type ServiceDoc } from "@/models/Service";
import { normalizeService } from "@/lib/data/normalize";
import Project, { type ProjectDoc } from "@/models/Project";
import ServicesEditor from "@/components/admin/ServicesEditor";

export const dynamic = "force-dynamic";

async function all(): Promise<ServiceDoc[]> {
  try {
    await connectToDatabase();
    // Admin view includes drafts, so no `published` filter here.
    const docs = await Service.find({}).sort({ order: 1 }).lean();
    const parsed = JSON.parse(JSON.stringify(docs)) as Partial<ServiceDoc>[];
    // Normalized: docs written before a field existed (or edited directly in
    // Mongo) come back from .lean() without it, and the editor's ListEditor
    // calls .length on these arrays unconditionally.
    return parsed.map(normalizeService);
  } catch {
    return [];
  }
}

async function linkableProjects() {
  try {
    await connectToDatabase();
    const docs = await Project.find({}).sort({ order: 1 }).select("name year published").lean();
    return (JSON.parse(JSON.stringify(docs)) as Partial<ProjectDoc>[]).map((p) => ({
      _id: String(p._id ?? ""),
      name: p.name ?? "",
      year: p.year ?? "",
      published: p.published !== false,
    }));
  } catch {
    return [];
  }
}

export default async function Page() {
  const [services, projects] = await Promise.all([all(), linkableProjects()]);
  return <ServicesEditor initial={services} projects={projects} />;
}
