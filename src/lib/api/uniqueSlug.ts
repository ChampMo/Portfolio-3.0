import type { Model } from "mongoose";

/**
 * Finds a slug that is not already taken, appending -2, -3, … as needed.
 *
 * There is still a theoretical race between the check and the insert; the
 * unique index remains the real guarantee, and `createHandler` turns the
 * resulting E11000 into a readable 409. This just means the common case
 * (clicking "Add project" twice) succeeds silently instead of erroring.
 */
export async function uniqueSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  base: string,
  excludeId?: string
): Promise<string> {
  const root = base || "item";

  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };

    const clash = await model.exists(filter);
    if (!clash) return candidate;
  }

  // Pathological fallback — effectively unreachable.
  return `${root}-${Date.now().toString(36)}`;
}
