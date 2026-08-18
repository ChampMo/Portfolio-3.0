import Product from "@/models/Product";
import { reorderHandler } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

export const PATCH = reorderHandler({ model: Product, name: "products" });
