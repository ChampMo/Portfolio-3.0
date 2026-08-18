import { getSkills } from "@/lib/data/queries";
import SkillsEditor from "@/components/admin/SkillsEditor";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const skills = await getSkills();
  return <SkillsEditor initial={skills} />;
}
