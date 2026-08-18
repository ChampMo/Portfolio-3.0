/**
 * Enum values shared by the Mongoose models and the client-side admin forms.
 *
 * These live outside `src/models/*` on purpose: importing a value (not just a
 * type) from a model file pulls mongoose — and therefore the whole mongodb
 * driver — into the browser bundle, which fails the build. Types are erased at
 * compile time and are safe to import from the models; values are not.
 */

export const EXPERIENCE_TYPES = [
  "INTERNSHIP",
  "ACADEMIC",
  "FREELANCE",
  "PROJECT",
  "WORK",
] as const;

export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export const PROJECT_STATUSES = ["DEPLOYED", "IN_ORBIT", "ARCHIVED"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_BLOCK_TYPES = [
  "heading",
  "paragraph",
  "link",
  "gallery",
  "quote",
  "divider",
] as const;

export type ProjectBlockType = (typeof PROJECT_BLOCK_TYPES)[number];

/**
 * Gallery blocks carry structured content; every other type carries a string.
 * `height` is the row height in px, matching the old builder's control.
 */
export type GalleryContent = {
  title: string;
  images: string[];
  height: number;
};

export type BlockContent = string | GalleryContent;

export function isGalleryContent(v: unknown): v is GalleryContent {
  return typeof v === "object" && v !== null && Array.isArray((v as GalleryContent).images);
}

/** Where a product runs. Drives the download picker and the platform chips. */
export const PRODUCT_PLATFORMS = [
  "WEB",
  "WINDOWS",
  "MACOS",
  "LINUX",
  "ANDROID",
  "IOS",
] as const;

export type ProductPlatform = (typeof PRODUCT_PLATFORMS)[number];

export const PRODUCT_STATUSES = ["LIVE", "BETA", "IN_DEVELOPMENT"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Which frame the screen sits in on the product deck. */
export const DEVICE_TYPES = ["DESKTOP", "PHONE"] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];
