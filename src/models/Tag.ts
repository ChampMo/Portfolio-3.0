import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";

/** Shared vocabulary for project tags and stack chips (autocomplete source). */
const TagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["tag", "tech"], default: "tech" },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/**
 * Unique per list, not globally.
 *
 * `name` alone used to be unique, which made the two vocabularies fight over
 * one namespace: adding a tag called "React" while "React" already existed as
 * a tech threw a duplicate-key error the route turned into a 500, and the
 * admin swallowed it. Every lookup in the routes is already scoped by `kind`,
 * so the index now matches what the code always assumed.
 *
 * The collation makes the index itself case-insensitive, so "next.js" can no
 * longer slip in beside "Next.js" — the regex check in the route is now backed
 * by the database instead of being the only thing standing in the way.
 */
TagSchema.index(
  { kind: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export type TagDoc = {
  _id: string;
  name: string;
  kind: "tag" | "tech";
  usageCount: number;
};

export default defineModel<TagDoc>("Tag", TagSchema);
