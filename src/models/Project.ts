import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";
import {
  PROJECT_STATUSES,
  PROJECT_BLOCK_TYPES,
  type ProjectStatus,
  type ProjectBlockType,
  type BlockContent,
} from "@/lib/content/constants";

/**
 * Rich content block for the project detail page. `content` is Mixed because
 * a block is either a string (heading/paragraph/code) or a string[] (gallery).
 */
const BlockSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true, enum: PROJECT_BLOCK_TYPES },
    content: { type: Schema.Types.Mixed, default: "" },
  },
  { _id: false }
);

/**
 * Fields added vs. the old schema: codename, year, role, status, summary,
 * stack, highlights, links, order, featured, published. The old model only
 * had title/time/coverImage/tags/blocks, which could not express the card
 * design (status badge, stack chips, highlight bullets, repo/live links).
 */
const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Machine-style label shown above the card title, e.g. PROJECT_AGENDA. */
    codename: { type: String, default: "", trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true },
    year: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    status: { type: String, enum: PROJECT_STATUSES, default: "DEPLOYED" },

    /** One-liner on the card. */
    summary: { type: String, default: "" },
    /** Long-form intro on the detail page. */
    description: { type: String, default: "" },

    stack: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    tags: { type: [String], default: [] },

    links: {
      repo: { type: String, default: "" },
      live: { type: String, default: "" },
    },

    coverImage: { type: String, default: "" },
    blocks: { type: [BlockSchema], default: [] },

    /** Detail-page opens. Not an analytics suite — just enough to know which
        projects are actually being read, so starring can be evidence-led. */
    views: { type: Number, default: 0 },

    featured: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ published: 1, order: 1 });

export type { ProjectStatus };

export type ProjectBlock = {
  id: string;
  type: ProjectBlockType;
  content: BlockContent;
};

export type ProjectDoc = {
  _id: string;
  name: string;
  codename: string;
  slug?: string;
  year: string;
  role: string;
  status: ProjectStatus;
  summary: string;
  description: string;
  stack: string[];
  highlights: string[];
  tags: string[];
  links: { repo: string; live: string };
  coverImage: string;
  blocks: ProjectBlock[];
  views: number;
  featured: boolean;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default defineModel<ProjectDoc>("Project", ProjectSchema);
