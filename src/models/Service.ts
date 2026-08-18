import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";

/**
 * One channel in the Service Bay patch panel.
 *
 * Fields added vs. the old schema: `code` (the short channel label shown in
 * the selector — WEB / UI / QA / ADVISORY), `tagline`, and `deliverables`.
 * `deliverables` existed in the mock data but the old schema had nowhere to
 * store it, so it never reached the database.
 */
const ServiceSchema = new Schema(
  {
    /** Short uppercase channel label, e.g. "WEB". Keep it under ~10 chars. */
    code: { type: String, default: "", trim: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    deliverables: { type: [String], default: [] },
    /** Optional links to Project documents that demonstrate this service. */
    linkedProjectIds: { type: [Schema.Types.ObjectId], ref: "Project", default: [] },

    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ServiceSchema.index({ published: 1, order: 1 });

export type ServiceDoc = {
  _id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  deliverables: string[];
  linkedProjectIds: string[];
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default defineModel<ServiceDoc>("Service", ServiceSchema);
