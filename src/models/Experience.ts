import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";
import { EXPERIENCE_TYPES, type ExperienceType } from "@/lib/content/constants";

/**
 * One row of the Mission Log. Promoted from an embedded sub-document to its
 * own collection so entries can be reordered and edited individually.
 *
 * Fields added vs. the old schema: organization, type, location, summary and
 * `stack` — `stack` is what renders as the chip row under each entry, which
 * the previous data model had no field for.
 */
const ExperienceSchema = new Schema(
  {
    role: { type: String, required: true, trim: true },
    organization: { type: String, default: "", trim: true },
    type: { type: String, enum: EXPERIENCE_TYPES, default: "WORK" },
    /** Free-text so "2024 - Present" and "2023" both work. */
    time: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    summary: { type: String, default: "" },
    /** Bullet list of what was achieved. */
    achievements: { type: [String], default: [] },
    /** Technology chips shown under the entry. */
    stack: { type: [String], default: [] },

    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ExperienceSchema.index({ published: 1, order: 1 });

export type { ExperienceType };

export type ExperienceDoc = {
  _id: string;
  role: string;
  organization: string;
  type: ExperienceType;
  time: string;
  location: string;
  summary: string;
  achievements: string[];
  stack: string[];
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default defineModel<ExperienceDoc>("Experience", ExperienceSchema);
