import { connectToDatabase } from "@/lib/db/mongodb";
import Product, { type ProductDoc } from "@/models/Product";
import Project from "@/models/Project";
import { normalizeProduct } from "@/lib/data/normalize";
import ProductsEditor from "@/components/admin/ProductsEditor";
import type { LinkableProject } from "@/components/admin/ProjectLinker";

export const dynamic = "force-dynamic";

type RawProject = {
  _id: unknown;
  name?: string;
  year?: string;
  published?: boolean;
  coverImage?: string;
  blocks?: Array<{ type?: string; content?: unknown }>;
};

/**
 * Every image a project already carries, cover first.
 *
 * A product's screenshots are nearly always pictures that were uploaded once
 * for the project write-up. Offering them here turns that into re-picking
 * rather than re-uploading, and the two records end up pointing at one asset
 * instead of two copies of it.
 */
function imagesOf(p: RawProject): string[] {
  const out: string[] = [];
  if (p.coverImage) out.push(p.coverImage);

  for (const block of p.blocks ?? []) {
    if (block?.type !== "gallery") continue;
    const content = block.content as { images?: unknown } | null;
    if (!Array.isArray(content?.images)) continue;
    for (const src of content.images) {
      if (typeof src === "string" && src) out.push(src);
    }
  }
  // The cover is usually in one of the galleries as well.
  return Array.from(new Set(out));
}

async function load() {
  try {
    await connectToDatabase();
    const [products, projects] = await Promise.all([
      Product.find({}).sort({ order: 1 }).lean(),
      Project.find({})
        .select("name year published coverImage blocks")
        .sort({ order: 1 })
        .lean(),
    ]);

    const raw = JSON.parse(JSON.stringify(projects)) as RawProject[];

    return {
      products: (JSON.parse(JSON.stringify(products)) as Partial<ProductDoc>[]).map(
        normalizeProduct
      ),
      projects: raw.map(
        (p): LinkableProject => ({
          _id: String(p._id),
          name: p.name ?? "",
          year: p.year ?? "",
          published: p.published !== false,
          images: imagesOf(p),
        })
      ),
    };
  } catch {
    return { products: [], projects: [] };
  }
}

export default async function Page() {
  const { products, projects } = await load();
  return <ProductsEditor initial={products} projects={projects} />;
}
