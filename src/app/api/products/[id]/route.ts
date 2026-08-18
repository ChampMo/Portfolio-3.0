import Product from "@/models/Product";
import { itemHandlers } from "@/lib/api/crud";
import { normalizeProduct } from "@/lib/data/normalize";
import { sanitiseProduct } from "@/lib/api/sanitisers";

export const dynamic = "force-dynamic";

const { GET, PUT, DELETE } = itemHandlers({
  model: Product,
  name: "products",
  normalise: normalizeProduct,
  sanitise: sanitiseProduct,
});

export { GET, PUT, DELETE };
