import Product from "@/models/Product";
import { listHandler, createHandler } from "@/lib/api/crud";
import { normalizeProduct } from "@/lib/data/normalize";
import { sanitiseProduct } from "@/lib/api/sanitisers";
import { uniqueSlug } from "@/lib/api/uniqueSlug";

export const dynamic = "force-dynamic";

const resource = {
  model: Product,
  name: "products",
  normalise: normalizeProduct,
  sanitise: sanitiseProduct,
  // `slug` carries a unique index and every new product starts with the same
  // default name, so a second one would fail with a raw E11000 without this.
  prepare: async (fields: Record<string, unknown>, model: typeof Product) => {
    const base = typeof fields.slug === "string" && fields.slug ? fields.slug : "product";
    fields.slug = await uniqueSlug(model, base);
  },
};

export const GET = listHandler(resource);
export const POST = createHandler(resource);
