import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Identity from "@/models/Identity";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, boom, readJson, bad } from "@/lib/api/respond";
import { normalizeIdentity } from "@/lib/data/normalize";
import { safeUrl } from "@/lib/content/url";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const doc = await Identity.findOne({ key: "main" }).lean();
    return ok(normalizeIdentity(doc ? JSON.parse(JSON.stringify(doc)) : null));
  } catch (err) {
    return boom(err, "GET /api/identity");
  }
}

/** Rewrites every known URL field in place through the scheme allowlist. */
function scrubUrls(body: Record<string, unknown>) {
  const socials = body.socials as Record<string, unknown> | undefined;
  if (socials && typeof socials === "object") {
    for (const k of Object.keys(socials)) socials[k] = safeUrl(socials[k]);
  }

  const media = body.media as Record<string, unknown> | undefined;
  if (media && typeof media === "object") {
    for (const k of ["avatar", "cvUrl", "transcriptUrl"]) {
      if (k in media) media[k] = safeUrl(media[k]);
    }
    if (Array.isArray(media.slideshowImages)) {
      media.slideshowImages = media.slideshowImages.map(safeUrl).filter(Boolean);
    }
  }

  const education = body.education as Record<string, unknown> | undefined;
  if (education && typeof education === "object" && "universityLogo" in education) {
    education.universityLogo = safeUrl(education.universityLogo);
  }
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad("Invalid JSON body");

  // `key` identifies the singleton; never let a client rewrite it.
  delete body.key;
  delete body._id;

  // This route writes `$set: body` wholesale rather than going through a
  // field-by-field sanitiser (mongoose's strict mode drops unknown paths), so
  // the URL-bearing fields are scrubbed explicitly. Every one of them ends up
  // in an href or a src on the public site.
  scrubUrls(body);

  try {
    await connectToDatabase();
    const doc = await Identity.findOneAndUpdate(
      { key: "main" },
      { $set: body },
      {
        upsert: true,
        // mongoose 9 deprecated `new`; this is the replacement.
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    ).lean();
    // Normalised so the editor never receives a partial shape — feeding one
    // back into form state flips controlled inputs to uncontrolled.
    return ok(normalizeIdentity(doc ? JSON.parse(JSON.stringify(doc)) : null));
  } catch (err) {
    return boom(err, "PUT /api/identity");
  }
}
