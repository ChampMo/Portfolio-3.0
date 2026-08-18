/**
 * Seeds the database with the real portfolio content.
 *
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * Safe to re-run: it upserts singletons and skips collections that already
 * have documents, so it will not duplicate or clobber edits made in the admin
 * panel. Pass --force to wipe and reseed the item collections.
 */
import mongoose from "mongoose";

const FORCE = process.argv.includes("--force");
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}

const identity = {
  key: "main",
  profile: {
    firstName: "Monthol",
    lastName: "Sukjinda",
    nickname: "Champ",
    role: "Full-Stack Developer",
    motto: "Never stop learning & build today for myself tomorrow.",
    intro:
      "I'm a 4th-year student majoring in Applied Computer Science. I'm looking for a job to improve my skills and gain real-world experience. I'm adaptable, open-minded, and always ready to learn new things. I also have good interpersonal skills.",
  },
  availability: { isOpen: true, label: "Open to work" },
  contact: {
    phone: "081-012-0500",
    email: "sonesambi@gmail.com",
    address: "Bangkok, Thailand",
    latitude: "13.7563",
    longitude: "100.5018",
    timezone: "Asia/Bangkok",
  },
  socials: {
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
  },
  education: {
    universityName: "King Mongkut's University of Technology Thonburi",
    universityShort: "KMUTT",
    universityLogo: "",
    major: "Bachelor of Science Program in Applied Computer Science",
    timelineStart: "2022",
    timelineEnd: "Present",
    gpax: "3.23",
  },
  media: { avatar: "", cvUrl: "", cvVisible: true, transcriptUrl: "", transcriptVisible: true },
};

const skills = {
  key: "main",
  categories: [
    { name: "LANGUAGES", order: 0, items: ["Python", "JavaScript / TypeScript", "SQL", "Java", "HTML / CSS"] },
    { name: "FRAMEWORKS", order: 1, items: ["React", "Next.js", "Node.js", "Tailwind CSS"] },
    { name: "DATABASE", order: 2, items: ["MySQL", "PostgreSQL", "MongoDB"] },
    { name: "TOOLS & TESTING", order: 3, items: ["Docker", "Git / GitHub", "VS Code", "Robot Framework", "Selenium"] },
  ],
};

const services = [
  {
    code: "WEB",
    name: "Web Application Development",
    tagline: "Full-stack apps that ship and scale.",
    description:
      "End-to-end product delivery: from data modelling and API design to a polished, responsive interface. Comfortable owning a feature from blank file to production deployment.",
    deliverables: [
      "Next.js / React frontends with TypeScript",
      "REST and server actions backed by relational or document databases",
      "Authentication, role-based access, and audit logging",
    ],
    order: 0,
  },
  {
    code: "UI",
    name: "UI Engineering & Motion",
    tagline: "Interfaces that feel alive.",
    description:
      "Design-conscious frontend work with a focus on motion, micro-interactions, and scroll choreography that stays readable rather than decorative.",
    deliverables: [
      "Component systems with Tailwind CSS",
      "GSAP and Framer Motion animation choreography",
      "WebGL scenes integrated cleanly with React state",
    ],
    order: 1,
  },
  {
    code: "QA",
    name: "QA Automation & Tooling",
    tagline: "Confidence shipped alongside code.",
    description:
      "Build automated test suites and internal tooling that keep release cadence high without sacrificing reliability.",
    deliverables: [
      "End-to-end suites with Selenium and Robot Framework",
      "CI pipelines reporting test health on every push",
      "Internal dashboards for QA visibility",
    ],
    order: 2,
  },
  {
    code: "ADVISORY",
    name: "Technical Consulting",
    tagline: "A second pair of eyes for early-stage builds.",
    description:
      "Architecture reviews, stack selection, and pragmatic guidance for student teams and early product squads.",
    deliverables: [
      "Stack and hosting recommendations",
      "Codebase walkthroughs with prioritised improvements",
      "Mentorship sessions on modern web tooling",
    ],
    order: 3,
  },
];

const projects = [
  {
    name: "Agenda",
    codename: "PROJECT_AGENDA",
    slug: "agenda",
    year: "2024",
    role: "Full-Stack Developer",
    status: "DEPLOYED",
    summary: "A modern task & schedule management platform with real-time sync.",
    description:
      "Agenda is a productivity hub that unifies daily tasks, calendar events, and collaborative notes into a single fluid interface. Built around a real-time data layer so teams can plan together without refresh friction.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "Prisma"],
    highlights: [
      "Designed and shipped the entire schema and REST layer.",
      "Implemented optimistic UI updates for sub-100ms perceived latency.",
      "Built a drag-and-drop weekly planner with keyboard accessibility.",
    ],
    tags: ["Full-Stack", "Productivity"],
    links: { repo: "https://github.com", live: "" },
    featured: true,
    order: 0,
  },
  {
    name: "ResumeHub",
    codename: "PROJECT_RESUMEHUB",
    slug: "resumehub",
    year: "2024",
    role: "Full-Stack Developer",
    status: "IN_ORBIT",
    summary: "An AI-assisted resume builder with live templates and export.",
    description:
      "ResumeHub helps job-seekers generate ATS-ready resumes from structured profile data. Templates are rendered server-side for pixel-accurate PDF exports, with an LLM layer that rewrites bullet points based on a target role.",
    stack: ["Next.js", "Node.js", "Tailwind CSS", "MongoDB", "OpenAI API"],
    highlights: [
      "Server-rendered PDF pipeline keeping fonts and layout consistent.",
      "Prompt engineering for role-aware bullet point rewriting.",
      "Sharable resume URLs with privacy-aware access tokens.",
    ],
    tags: ["AI", "Full-Stack"],
    links: { repo: "https://github.com", live: "" },
    featured: true,
    order: 1,
  },
  {
    name: "Tech Balance",
    codename: "PROJECT_TECH_BALANCE",
    slug: "tech-balance",
    year: "2023",
    role: "Frontend Developer",
    status: "ARCHIVED",
    summary: "A dashboard surfacing personal screen-time & focus analytics.",
    description:
      "Tech Balance ingests device usage data and visualises focus vs distraction patterns. The goal: nudge healthier digital habits with friendly weekly reports rather than guilt-driven alerts.",
    stack: ["React", "TypeScript", "Recharts", "Node.js", "MySQL"],
    highlights: [
      "Built composable chart primitives on top of Recharts.",
      "Authored the weekly digest engine summarising usage trends.",
      "Reduced first-paint by 40% through route-level code splitting.",
    ],
    tags: ["Frontend", "Data Viz"],
    links: { repo: "https://github.com", live: "" },
    featured: false,
    order: 2,
  },
];

const experience = [
  {
    role: "Full-Stack Developer Intern",
    organization: "TBD Tech Studio",
    type: "INTERNSHIP",
    time: "2025",
    location: "Bangkok, Thailand",
    summary: "Joined a small product team to ship customer-facing features across the stack.",
    achievements: [
      "Delivered 3 production features end-to-end during the internship.",
      "Improved page load by 30% through targeted query and bundle audits.",
      "Wrote internal docs that onboarded the next intern in under a week.",
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Docker"],
    order: 0,
  },
  {
    role: "Lead Developer — Senior Project",
    organization: "KMUTT, Applied Computer Science",
    type: "ACADEMIC",
    time: "2024 - 2025",
    location: "KMUTT Campus",
    summary: "Led a 4-person team building a data-driven web platform as our final-year capstone.",
    achievements: [
      "Owned system architecture and code review standards.",
      "Designed the database schema and API contracts for the team.",
      "Presented the project to faculty and industry reviewers.",
    ],
    stack: ["React", "Node.js", "MySQL"],
    order: 1,
  },
  {
    role: "QA Automation — Coursework",
    organization: "KMUTT, Software Testing",
    type: "ACADEMIC",
    time: "2024",
    location: "KMUTT Campus",
    summary: "Authored automated test suites for a class-wide web application project.",
    achievements: [
      "Built a Robot Framework suite covering core user journeys.",
      "Integrated Selenium scripts into a basic CI workflow.",
    ],
    stack: ["Robot Framework", "Selenium", "Python"],
    order: 2,
  },
  {
    role: "Freelance Web Developer",
    organization: "Independent",
    type: "FREELANCE",
    time: "2023 - Present",
    location: "Remote",
    summary:
      "Occasional contract work building landing pages and small dashboards for student orgs and friends' startups.",
    achievements: [
      "Shipped 5+ landing pages with custom CMS-backed content.",
      "Maintained ongoing support and analytics for active clients.",
    ],
    stack: ["Next.js", "Tailwind CSS", "MongoDB"],
    order: 3,
  },
];

// Loose schemas: this script only writes, the app owns validation.
const loose = () => new mongoose.Schema({}, { strict: false, timestamps: true });

async function main() {
  const conn = await mongoose.connect(uri, { family: 4 });
  const dbName = conn.connection.db.databaseName;
  console.log(`connected — database: ${dbName}`);

  // A URI with no /dbname lands on "test", which is very likely someone
  // else's data (the previous portfolio used it). Refuse rather than write
  // new-schema documents into a collection that already holds another shape.
  if (dbName === "test") {
    console.error(
      "\n⚠  MONGODB_URI has no database name, so this would write into `test`.\n" +
        "   Add one to the URI, e.g.  ...mongodb.net/portfolio3?retryWrites=true\n" +
        "   Aborting so existing data is left untouched."
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const Identity = mongoose.model("Identity", loose(), "identities");
  const Skill = mongoose.model("Skill", loose(), "skills");
  const Service = mongoose.model("Service", loose(), "services");
  const Project = mongoose.model("Project", loose(), "projects");
  const Experience = mongoose.model("Experience", loose(), "experiences");

  // Singletons: upsert so re-running keeps a single record.
  await Identity.updateOne({ key: "main" }, { $set: identity }, { upsert: true });
  console.log("identity  ✓ upserted");
  await Skill.updateOne({ key: "main" }, { $set: skills }, { upsert: true });
  console.log("skills    ✓ upserted");

  for (const [label, Model, rows] of [
    ["services  ", Service, services],
    ["projects  ", Project, projects],
    ["experience", Experience, experience],
  ]) {
    const existing = await Model.countDocuments({});
    if (existing > 0 && !FORCE) {
      // Loud, not incidental: a silent skip here is exactly how a database
      // ends up holding old-schema documents that the site then filters out,
      // making whole sections disappear with no error anywhere.
      console.warn(
        `${label} ⚠  SKIPPED — ${existing} document(s) already present.\n` +
          `             Nothing was written. If those are from an older schema the site\n` +
          `             will render this section empty. Run \`npm run seed:force\` to replace them.`
      );
      continue;
    }
    if (FORCE) await Model.deleteMany({});
    await Model.insertMany(rows.map((r) => ({ ...r, published: true })));
    console.log(`${label} ✓ inserted ${rows.length}`);
  }

  await mongoose.disconnect();
  console.log("\ndone.");
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
