import { connectToDatabase } from "@/lib/db/mongodb";
import Resume, { type ResumeDoc } from "@/models/Resume";
import Experience, { type ExperienceDoc } from "@/models/Experience";
import Project, { type ProjectDoc } from "@/models/Project";
import Identity, { type IdentityDoc } from "@/models/Identity";
import Skill, { type SkillDoc } from "@/models/Skill";
import Service, { type ServiceDoc } from "@/models/Service";
import {
  normalizeResume,
  normalizeExperience,
  normalizeProject,
  normalizeIdentity,
  normalizeSkill,
  normalizeService,
} from "@/lib/data/normalize";
import ResumeEditor from "@/components/admin/ResumeEditor";
import { siteUrl } from "@/lib/site/url";

export const dynamic = "force-dynamic";

async function load() {
  try {
    await connectToDatabase();
    const [resumes, experience, projects, identity, skills, services] = await Promise.all([
      Resume.find({}).sort({ order: 1 }).lean(),
      Experience.find({}).sort({ order: 1 }).lean(),
      Project.find({}).sort({ order: 1 }).lean(),
      Identity.findOne({ key: "main" }).lean(),
      Skill.findOne({ key: "main" }).lean(),
      Service.find({}).sort({ order: 1 }).lean(),
    ]);

    const json = <T,>(v: unknown) => JSON.parse(JSON.stringify(v)) as T;

    return {
      resumes: json<Partial<ResumeDoc>[]>(resumes).map(normalizeResume),
      experience: json<Partial<ExperienceDoc>[]>(experience).map(normalizeExperience),
      projects: json<Partial<ProjectDoc>[]>(projects).map(normalizeProject),
      identity: identity ? normalizeIdentity(json<Partial<IdentityDoc>>(identity)) : null,
      // `normalizeSkill` returns null for a missing document, and the sheet
      // wants the categories rather than the wrapper.
      skills: normalizeSkill(skills ? json<Partial<SkillDoc>>(skills) : null)?.categories ?? [],
      services: json<Partial<ServiceDoc>[]>(services).map(normalizeService),
    };
  } catch {
    return {
      resumes: [],
      experience: [],
      projects: [],
      identity: null,
      skills: [],
      services: [],
    };
  }
}

export default async function Page() {
  const data = await load();
  // A CV that went out advertising `localhost:3000` would be a bad day, so a
  // development origin seeds nothing and the field starts empty.
  const site = /localhost|127\.0\.0\.1/.test(siteUrl) ? "" : siteUrl;
  return <ResumeEditor {...data} siteUrl={site} />;
}
