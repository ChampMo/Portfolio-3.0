import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";
import {
  PRODUCT_PLATFORMS,
  PRODUCT_STATUSES,
  DEVICE_TYPES,
  type ProductPlatform,
  type ProductStatus,
  type DeviceType,
} from "@/lib/content/constants";

/** A manually entered download. Used when there is no GitHub repo to read. */
const DownloadSchema = new Schema(
  {
    platform: { type: String, enum: PRODUCT_PLATFORMS, default: "WINDOWS" },
    label: { type: String, default: "", trim: true },
    url: { type: String, default: "", trim: true },
    /** Free text, e.g. "x64" or "Apple Silicon". */
    arch: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/**
 * Shipped software, as opposed to a case study.
 *
 * Separate from `Project` because the two answer different questions to
 * different people: a project explains how something was built, a product
 * hands you the thing. They cross-link (`projectId`) so one visitor can follow
 * either thread.
 */
const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true },
    tagline: { type: String, default: "", trim: true },
    description: { type: String, default: "" },

    platforms: { type: [String], enum: PRODUCT_PLATFORMS, default: [] },
    status: { type: String, enum: PRODUCT_STATUSES, default: "LIVE" },

    icon: { type: String, default: "" },
    screenshots: { type: [String], default: [] },
    /** Beats a screenshot for anything whose selling point is motion. */
    demoVideo: { type: String, default: "" },
    deviceType: { type: String, enum: DEVICE_TYPES, default: "DESKTOP" },

    /** Opened by the primary button, embedded in the frame when allowed. */
    liveUrl: { type: String, default: "", trim: true },
    /**
     * Whether the live URL may be framed on the deck. Off by default: most
     * hosts refuse to be embedded, and a blank iframe looks broken where a
     * screenshot would have looked fine.
     */
    embedLive: { type: Boolean, default: false },

    /**
     * "owner/repo". When set, version, size, dates and every download link are
     * read from the repository's latest release at request time, so publishing
     * a release is the only step needed to update this page.
     */
    githubRepo: { type: String, default: "", trim: true },

    /** Fallbacks, and the only source when `githubRepo` is empty. */
    version: { type: String, default: "", trim: true },
    downloads: { type: [DownloadSchema], default: [] },

    /** Shown under the download button, e.g. the macOS quarantine workaround. */
    installNotes: { type: String, default: "" },

    /**
     * A self-contained HTML document rendered behind this product's panel, so
     * each one can carry a flourish of its own. Stored verbatim and never
     * injected into this page — it runs inside a sandboxed iframe. See
     * ProductBackdrop for why that distinction is the whole feature.
     */
    backdropHtml: { type: String, default: "" },
    /** 0-100. Pushes a busy backdrop behind the text. */
    backdropOpacity: { type: Number, default: 55 },

    /** Cross-link to the case study in the archive. */
    projectId: { type: String, default: "" },

    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ published: 1, order: 1 });

export type ProductDownload = {
  platform: ProductPlatform;
  label: string;
  url: string;
  arch: string;
};

export type ProductDoc = {
  _id: string;
  name: string;
  slug?: string;
  tagline: string;
  description: string;
  platforms: ProductPlatform[];
  status: ProductStatus;
  icon: string;
  screenshots: string[];
  demoVideo: string;
  deviceType: DeviceType;
  liveUrl: string;
  embedLive: boolean;
  githubRepo: string;
  version: string;
  downloads: ProductDownload[];
  installNotes: string;
  backdropHtml: string;
  backdropOpacity: number;
  projectId: string;
  featured: boolean;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default defineModel<ProductDoc>("Product", ProductSchema);
