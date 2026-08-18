@AGENTS.md

# Portfolio 3.0 — "SIGNAL"

Rebuild of Monthol Sukjinda's (Champ) portfolio. Replaces the 3D R3F site in
`GitHub/Portfolio-2` with a flat 2D parallax **flight-deck telemetry** design.
That older repo is reference only — do not port its 3D layer.

## Commands

- `npm run dev` — dev server (Turbopack, default in Next 16)
- `npm run build` / `npm run typecheck` / `npm run lint`
- `npm run seed` — seed DB with real content (safe to re-run)
- `npm run seed:force` — wipe item collections and reseed

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 (CSS-first `@theme inline`) ·
Mongoose · nodemailer · Cloudinary · GSAP + Framer Motion.
**No Three.js / R3F. No Pusher.** Both were deliberately dropped.

## Design tokens

Defined once in `src/app/globals.css` and exposed as Tailwind utilities
(`bg-ground`, `text-signal`, `border-grid`…). Never hardcode hex values.

| Token | Dark | Role |
|---|---|---|
| `--ground` | `#12110D` | page background |
| `--panel` / `--panel-2` | `#1B1914` / `#232019` | cards, hover |
| `--grid` | `#33301F` | borders, rules |
| `--ink` / `--ink-muted` | `#F2EDE2` / `#8C8672` | text |
| `--signal` | `#FF8A34` | the single accent — CTAs, active state |
| `--telemetry` | `#5FB8C4` | data readouts, used sparingly |

Type: Big Shoulders Display (headings) / Public Sans (body) / JetBrains Mono
(labels, data). Self-hosted in `src/app/fonts`, wired via `next/font/local`.
**Latin subset only** — Thai copy would need a different subset.

---

## Caveats (do not undo)

### 1. `defineModel` must not pass generics to `mongoose.model<T>()`
Calling `mongoose.model<T>(name, schema)` with an unparameterized `Schema`
makes TypeScript unify two large generic types and **exhausts an 8 GB heap** —
`tsc` dies with "Ineffective mark-compacts near heap limit" on even a trivial
model. `src/lib/db/defineModel.ts` casts the result instead. Keep it that way.

### 2. Auth is enforced in the layout, not in `proxy.ts`
Next 16 renamed `middleware` → `proxy` (nodejs runtime only). `src/proxy.ts`
verifies only the cookie *signature* to avoid a DB call per request; it is a
UX redirect, not authorization. Real enforcement is `getAdmin()` in
`src/app/admin/(protected)/layout.tsx` and in every mutating route handler.

### 3. `/admin/signin` lives outside the protected route group
The gate is at `admin/(protected)/layout.tsx`, **not** `admin/layout.tsx`. A
layout that both guards and wraps the sign-in page redirects to itself forever.

### 4. The allowlist fails closed
`ADMIN_ALLOWED_EMAILS` empty ⇒ nobody can sign in. Never "default to allow" if
the env var is missing.

### 5. Never `overflow-x: hidden` on `body`
It silently breaks `position: sticky`, which the pinned hero and the horizontal
project rail both depend on. Clip on an inner container instead.

### 6. The parallax loop must not read layout
Cache geometry on resize; inside `requestAnimationFrame` only *write*
transforms. Interleaving reads and writes causes layout thrashing and visible
jank once several parallax layers are active.

### 7. Async request APIs
Next 16 removed sync access: `cookies()`, `headers()`, `params`, and
`searchParams` are all Promises and must be awaited.

### 8. Real secrets go in `.env.local`, never `.env.example`
`.env.example` is committed (it is un-ignored in `.gitignore`). It must only
ever contain placeholders.

---

## Data model notes

Content lives in MongoDB and is edited through `/admin`. Fields added beyond
the old site's schema, because the old one could not express the new design:

- **Experience** — `organization`, `type`, `location`, `summary`, `stack`
  (`stack` renders the chip row under each log entry)
- **Service** — `code`, `tagline`, `deliverables` (the patch-bay readout)
- **Project** — `codename`, `slug`, `year`, `status`, `summary`, `stack`,
  `highlights`, `links`, `blocks`, `featured`, `order`
- **Identity** — `role`, `availability`, `media.slideshowImages`, editable
  per-section eyebrow/lead

### 9. Satori cannot read woff2

`ImageResponse` (`next/og`) renders through Satori, which accepts TTF/OTF/WOFF
but **not** WOFF2 — and every font in `src/app/fonts/` is woff2. Social cards
therefore use the bundled default face and carry the brand through layout,
colour and letter-spacing instead. Converting a display face to TTF and
loading it in `src/lib/og/OgCard.tsx` is the only way to change that; do not
"fix" it by pointing Satori at the woff2 files.

### 10. `replaceState` must carry the existing state forward

`window.history.replaceState(null, …)` wipes the entry's whole state object,
including the App Router's own bookkeeping and the `signalOrigin` /
`signalDepth` tags `RouteTrail` writes. Always pass `window.history.state` as
the first argument. The archive's URL sync (`ArchiveDeck`) and the trail
tagger both depend on this.

### 11. "Back" is a history distance, not a path

A project page can be reached from the home rail, from the archive, or from
another project via the pager. `BackLink` therefore steps `history.go(-depth)`
rather than pushing a path: only a real history step restores the archive's
filters, view mode and scroll position. The depth lives on each history entry
so browser back/forward keeps it correct — see `src/components/site/RouteTrail.tsx`.


### Project article blocks
`blocks` powers `/work/[slug]`. Types live in `lib/content/constants.ts`
(`heading` · `paragraph` · `link` · `gallery` · `quote` · `divider`). Every
type stores a string except `gallery`, which stores
`{ title, images[], height }`. `sanitiseBlocks` in `lib/api/sanitisers.ts`
rebuilds each block field-by-field and drops unknown types — the public
renderer has no fallback case for them.

### Reads must be normalized
`.lean()` does **not** apply schema defaults, so documents written before a
field existed come back missing it and `.length` / `.map` throw. Everything
read from Mongo goes through `lib/data/normalize.ts` first. Related: public
queries filter with `{ published: { $ne: false } }`, never `=== true`, so a
document lacking the field is treated as published (matching the default).

`Service`, `Experience` and `Project` are their own collections with an
`order` field (the old site nested them inside singleton documents, which made
per-item CRUD and reordering awkward). `Identity` and `Skill` stay singletons
keyed `main`.
