import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, bad, boom } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "application/pdf",
]);

/**
 * Server-side Cloudinary upload. The signed credentials never reach the
 * browser, and the admin gate means an anonymous visitor cannot use this as
 * free file hosting.
 */
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    return bad("Cloudinary is not configured. Set the CLOUDINARY_* env vars.", 501);
  }

  let file: File | null = null;
  let folder = "portfolio";
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
    const fld = form.get("folder");
    if (typeof fld === "string" && /^[\w/-]{1,60}$/.test(fld)) folder = fld;
  } catch {
    return bad("Expected multipart/form-data with a `file` field");
  }

  if (!file) return bad("No file provided");
  if (file.size > MAX_BYTES) return bad("File is larger than 8 MB", 413);
  if (!ALLOWED.has(file.type)) return bad(`Unsupported file type: ${file.type}`, 415);

  try {
    // Cloudinary signed upload: sha1 of the alphabetised params + api secret.
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `folder=${folder}&timestamp=${timestamp}${secret}`;
    const { createHash } = await import("crypto");
    const signature = createHash("sha1").update(toSign).digest("hex");

    const upload = new FormData();
    upload.append("file", file);
    upload.append("api_key", key);
    upload.append("timestamp", String(timestamp));
    upload.append("folder", folder);
    upload.append("signature", signature);

    const resourceType = file.type === "application/pdf" ? "raw" : "image";
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`,
      { method: "POST", body: upload }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[upload] cloudinary rejected:", detail);
      return bad("Upload failed. Check the Cloudinary configuration.", 502);
    }

    const data = (await res.json()) as { secure_url?: string; public_id?: string };
    if (!data.secure_url) return bad("Upload succeeded but returned no URL", 502);

    return ok({ url: data.secure_url, publicId: data.public_id ?? "" });
  } catch (err) {
    return boom(err, "POST /api/upload");
  }
}
