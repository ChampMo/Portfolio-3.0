import { connectToDatabase } from "@/lib/db/mongodb";
import Experience, { type ExperienceDoc } from "@/models/Experience";
import { normalizeExperience } from "@/lib/data/normalize";
import ExperienceEditor from "@/components/admin/ExperienceEditor";

export const dynamic = "force-dynamic";

async function all(): Promise<ExperienceDoc[]> {
  try {
    await connectToDatabase();
    const docs = await Experience.find({}).sort({ order: 1 }).lean();
    const parsed = JSON.parse(JSON.stringify(docs)) as Partial<ExperienceDoc>[];
    return parsed.map(normalizeExperience);
  } catch {
    return [];
  }
}

export default async function Page() {
  return <ExperienceEditor initial={await all()} />;
}
