import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";
import { RESUME_SECTIONS, type ResumeSection } from "@/lib/content/constants";

const EntrySchema = new Schema(
  {
    /**
     * The archive record this was seeded from, kept so the editor can offer to
     * re-read the original and can say when the original has since changed.
     * Empty for an entry typed from scratch.
     */
    sourceId: { type: String, default: "" },
    /** Role for an experience entry, project name for a project one. */
    title: { type: String, default: "", trim: true },
    /** Employer, or the project's own role line. */
    subtitle: { type: String, default: "", trim: true },
    /** Free text — "Jul 2025 – Oct 2025", "2024", "May 2025". */
    time: { type: String, default: "", trim: true },
    bullets: { type: [String], default: [] },
    /**
     * Off keeps the entry in the sheet without printing it, so one CV can be
     * re-aimed at a different role by unticking rather than deleting.
     */
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    key: { type: String, enum: RESUME_SECTIONS, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * One printable CV.
 *
 * A collection rather than a single document: the same person applying to a
 * back-end role and to a QA role needs the same header and different middles,
 * and keeping those as separate sheets is less error-prone than editing one
 * back and forth before every application.
 *
 * Nothing here is public. The site's own `/resume` page renders from the live
 * archive; these sheets exist to be printed to PDF and attached.
 */
const ResumeSchema = new Schema(
  {
    /** Shown only in the admin list — "Full-stack", "QA / Automation". */
    name: { type: String, required: true, trim: true },
    /** Printed under the name, in place of the site's role line. */
    headline: { type: String, default: "", trim: true },
    /**
     * Portfolio address, printed on the contact line.
     *
     * Stored per sheet rather than read from the deployment: printing happens
     * from whatever host the admin is open on, and a CV that went out saying
     * `localhost:3000` would be a bad day.
     */
    website: { type: String, default: "", trim: true },
    sections: { type: [SectionSchema], default: [] },
    experience: { type: [EntrySchema], default: [] },
    projects: { type: [EntrySchema], default: [] },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

export type ResumeEntry = {
  sourceId: string;
  title: string;
  subtitle: string;
  time: string;
  bullets: string[];
  enabled: boolean;
};

export type ResumeSectionRow = {
  key: ResumeSection;
  enabled: boolean;
  order: number;
};

export type ResumeDoc = {
  _id: string;
  name: string;
  headline: string;
  website: string;
  sections: ResumeSectionRow[];
  experience: ResumeEntry[];
  projects: ResumeEntry[];
  order: number;
};

export default defineModel("Resume", ResumeSchema);
