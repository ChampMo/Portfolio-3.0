/**
 * The sort every hand-ordered collection is read with.
 *
 * `order` alone is not enough. Mongo's sort is not stable, so two documents
 * holding the same `order` come back in whatever sequence the query plan
 * happens to produce — which is not required to be the same sequence twice.
 * That is how the admin list could reshuffle itself on a plain page load, with
 * nothing having been dragged.
 *
 * `createdAt` puts the older one first, which is the sensible reading of a
 * tie. `_id` is the backstop: it is unique and always present, so the sort is
 * total no matter what state the data is in. Ties should not exist — see
 * useCollection's `reorder` — but a duplicate must never be able to change
 * what the page looks like.
 */
export const BY_ORDER = { order: 1, createdAt: 1, _id: 1 } as const;
