import mongoose, { Schema, Model } from "mongoose";

/**
 * Registers a model, reusing the compiled one when it already exists.
 *
 * Turbopack re-evaluates modules on edit and `mongoose.model()` throws
 * OverwriteModelError if the name is already registered, so the cache is not
 * optional.
 *
 * **In development the cached model is discarded first.** The registry lives on
 * the mongoose singleton, which survives hot reload — so a model compiled
 * before a field was added keeps its old schema for the rest of the dev
 * session. With `strict` on (the default), a write to the new path is then
 * dropped *silently*: no error, no warning, the request succeeds, and the value
 * simply never lands in the database. That failure is close to unreadable from
 * the outside, and it costs one line to make impossible. Production compiles
 * each model once, so the branch never runs there.
 *
 * Note: the document type is applied by casting the result rather than by
 * calling `mongoose.model<T>(...)`. Handing the generic to mongoose forces
 * TypeScript to unify `Model<T>` against the schema's own inferred generics,
 * which blows the compiler's heap on this schema set. Casting keeps call
 * sites fully typed at zero inference cost.
 */
export function defineModel<T>(name: string, schema: Schema): Model<T> {
  const existing = mongoose.models[name] as Model<T> | undefined;

  if (existing) {
    if (process.env.NODE_ENV === "production") return existing;
    mongoose.deleteModel(name);
  }

  return mongoose.model(name, schema) as unknown as Model<T>;
}
