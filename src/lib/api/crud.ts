import { NextResponse } from "next/server";
import mongoose, { Model } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, bad, boom, readJson } from "./respond";

/**
 * Shared handlers for the ordered content collections (services, projects,
 * experience). Each resource supplies only its own field sanitiser; the auth
 * gate, connection, id validation and 404 handling are identical and live here.
 *
 * Reads are public (the site renders from them). Writes always require an
 * authenticated admin.
 *
 * The model is typed loosely on purpose. Threading a document generic through
 * these helpers makes mongoose's write-side types (`create`, `bulkWrite`,
 * `UpdateFilter`) unsolvable for an unconstrained `T`, and the concrete typing
 * that matters is already applied at the read sites in `lib/data/queries.ts`.
 * Field shape on the write path is guaranteed by the sanitisers instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;

export type Sanitiser = (input: Record<string, unknown>) => Record<string, unknown>;

/**
 * Applied to every document on the way OUT. The admin feeds write responses
 * straight back into form state, so a doc missing a field would flip a
 * controlled input to uncontrolled ("changing an uncontrolled input to be
 * controlled"). Normalising here means no consumer ever sees a partial shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Normaliser = (raw: any) => unknown;

/**
 * Flattens a Mongoose result to plain JSON before it reaches a normaliser.
 *
 * `.lean()` and `.toJSON()` both hand back live `ObjectId` and `Date`
 * instances. The normalisers accept only primitives — `text()` returns "" for
 * anything that is not a string — so an un-serialised document arrives at the
 * client with `_id: ""`. Every one of them then shares the same React key, and
 * any write addressed by id goes to `/api/<resource>/`.
 */
function plain<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type Resource = {
  model: AnyModel;
  name: string;
  sanitise: Sanitiser;
  normalise: Normaliser;
  /**
   * Optional async fix-up applied to sanitised fields just before insert —
   * for anything that needs to consult the database, such as resolving a
   * unique slug. Sanitisers are sync and cannot do this.
   */
  prepare?: (fields: Record<string, unknown>, model: AnyModel) => Promise<void>;
};

/**
 * MongoDB unique-index violation. Surfaced as a readable 409 rather than a
 * 500, so the admin sees which field clashed instead of "Something went wrong".
 */
function duplicateKeyField(err: unknown): string | null {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  if (e?.code !== 11000) return null;
  return Object.keys(e.keyPattern ?? {})[0] ?? "value";
}

export function listHandler({ model, name, normalise }: Omit<Resource, "sanitise">) {
  return async function GET(req: Request) {
    try {
      await connectToDatabase();
      // Admins can request drafts; the public list is always published-only.
      const wantsAll = new URL(req.url).searchParams.get("all") === "1";
      const isAdmin = wantsAll && !((await requireAdmin()) instanceof NextResponse);

      // `$ne: false` rather than `=== true`, so documents written without the
      // field (direct DB inserts, pre-existing data) are treated as published,
      // matching the schema default. See lib/data/queries.ts.
      const filter = isAdmin ? {} : { published: { $ne: false } };
      const docs = await model.find(filter).sort({ order: 1, createdAt: 1 }).lean();
      return ok(plain<unknown[]>(docs).map(normalise));
    } catch (err) {
      return boom(err, `GET /api/${name}`);
    }
  };
}

export function createHandler({ model, name, sanitise, normalise, prepare }: Resource) {
  return async function POST(req: Request) {
    const gate = await requireAdmin();
    if (gate instanceof NextResponse) return gate;

    const body = await readJson<Record<string, unknown>>(req);
    if (!body) return bad("Invalid JSON body");

    try {
      await connectToDatabase();
      const fields = sanitise(body);

      // New items land at the end unless an explicit order was supplied.
      if (fields.order === undefined) {
        const last = (await model.findOne({}).sort({ order: -1 }).lean()) as
          | { order?: number }
          | null;
        fields.order = typeof last?.order === "number" ? last.order + 1 : 0;
      }

      if (prepare) await prepare(fields, model);

      const doc = await model.create(fields);
      return ok(normalise(plain(doc)), 201);
    } catch (err) {
      if (err instanceof mongoose.Error.ValidationError) return bad(err.message, 422);
      const dup = duplicateKeyField(err);
      if (dup) return bad(`That ${dup} is already taken. Pick another.`, 409);
      return boom(err, `POST /api/${name}`);
    }
  };
}

export function itemHandlers({ model, name, sanitise, normalise }: Resource) {
  return {
    async GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
      // Admin-only, unlike the list.
      //
      // `findById` has no published filter, so this returned unpublished
      // drafts to anyone who could guess an ObjectId — which defeats the point
      // of the draft flag. Nothing on the public site calls it (the site reads
      // Mongo directly and the admin loads through server components), so
      // closing it costs nothing.
      const gate = await requireAdmin();
      if (gate instanceof NextResponse) return gate;

      const { id } = await ctx.params;
      if (!mongoose.isValidObjectId(id)) return bad("Invalid id", 400);
      try {
        await connectToDatabase();
        const doc = await model.findById(id).lean();
        if (!doc) return bad("Not found", 404);
        return ok(normalise(plain(doc)));
      } catch (err) {
        return boom(err, `GET /api/${name}/${id}`);
      }
    },

    async PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
      const gate = await requireAdmin();
      if (gate instanceof NextResponse) return gate;

      const { id } = await ctx.params;
      if (!mongoose.isValidObjectId(id)) return bad("Invalid id", 400);

      const body = await readJson<Record<string, unknown>>(req);
      if (!body) return bad("Invalid JSON body");

      try {
        await connectToDatabase();
        const updated = await model
          .findByIdAndUpdate(id, { $set: sanitise(body) }, {
            returnDocument: "after",
            runValidators: true,
          })
          .lean();
        if (!updated) return bad("Not found", 404);
        return ok(normalise(plain(updated)));
      } catch (err) {
        if (err instanceof mongoose.Error.ValidationError) return bad(err.message, 422);
        const dup = duplicateKeyField(err);
        if (dup) return bad(`That ${dup} is already taken. Pick another.`, 409);
        return boom(err, `PUT /api/${name}/${id}`);
      }
    },

    async DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
      const gate = await requireAdmin();
      if (gate instanceof NextResponse) return gate;

      const { id } = await ctx.params;
      if (!mongoose.isValidObjectId(id)) return bad("Invalid id", 400);

      try {
        await connectToDatabase();
        const deleted = await model.findByIdAndDelete(id).lean();
        if (!deleted) return bad("Not found", 404);
        return ok({ ok: true, id });
      } catch (err) {
        return boom(err, `DELETE /api/${name}/${id}`);
      }
    },
  };
}

/** PATCH /api/<name>/reorder — body: { ids: [...] } in display order. */
export function reorderHandler({ model, name }: Pick<Resource, "model" | "name">) {
  return async function PATCH(req: Request) {
    const gate = await requireAdmin();
    if (gate instanceof NextResponse) return gate;

    const body = await readJson<{ ids?: unknown }>(req);
    const ids = Array.isArray(body?.ids) ? body.ids : null;
    if (!ids) return bad("Expected { ids: [...] }");
    if (!ids.every((id) => typeof id === "string" && mongoose.isValidObjectId(id))) {
      return bad("ids must all be valid object ids");
    }

    try {
      await connectToDatabase();
      await model.bulkWrite(
        ids.map((id: string, index: number) => ({
          updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
        }))
      );
      return ok({ ok: true, count: ids.length });
    } catch (err) {
      return boom(err, `PATCH /api/${name}/reorder`);
    }
  };
}
