import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";

const SkillCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    items: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Singleton (key: "main"). Categories are an array rather than the old fixed
 * languages/database/frameworks/tools keys, so categories can be renamed,
 * reordered, added or removed from the admin panel without a schema change.
 */
const SkillSchema = new Schema(
  {
    key: { type: String, unique: true, default: "main" },
    categories: {
      type: [SkillCategorySchema],
      default: [
        { name: "LANGUAGES", items: [], order: 0 },
        { name: "FRAMEWORKS", items: [], order: 1 },
        { name: "DATABASE", items: [], order: 2 },
        { name: "TOOLS & TESTING", items: [], order: 3 },
      ],
    },
  },
  { timestamps: true }
);

export type SkillCategory = { name: string; items: string[]; order: number };

export type SkillDoc = {
  _id: string;
  key: string;
  categories: SkillCategory[];
};

export default defineModel<SkillDoc>("Skill", SkillSchema);
