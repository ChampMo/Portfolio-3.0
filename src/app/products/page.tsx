import "../site.css";
import type { Metadata } from "next";
import { getProducts, getProjects } from "@/lib/data/queries";
import { getLatestRelease } from "@/lib/github/release";
import ReticleCursor from "@/components/site/ReticleCursor";
import Reveal from "@/components/site/Reveal";
import CommandPalette from "@/components/site/CommandPalette";
import BackLink from "@/components/site/BackLink";
import ThemeToggle from "@/components/ThemeToggle";
import ProductDeck, { type DeckUnit } from "@/components/site/ProductDeck";

export const dynamic = "force-dynamic";

const TITLE = "Deployment Bay — Monthol Sukjinda";
const DESCRIPTION = "Software you can open and download right now.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/products" },
  openGraph: { type: "website", url: "/products", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function ProductsPage() {
  const [products, projects] = await Promise.all([getProducts(), getProjects()]);

  // Releases are fetched in parallel and cached for an hour inside
  // `getLatestRelease`; a product without a repo simply resolves to null.
  const units: DeckUnit[] = await Promise.all(
    products.map(async (product) => ({
      product,
      release: product.githubRepo ? await getLatestRelease(product.githubRepo) : null,
      projectSlug:
        projects.find((p) => p._id === product.projectId)?.slug ?? null,
    }))
  );

  return (
    <>
      <ReticleCursor />
      <Reveal />
      <CommandPalette />

      <div className="flex min-h-svh flex-col bg-ground">
        <header className="shrink-0 border-b border-grid">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-[var(--pad-x)] py-5 sm:gap-4">
            {/* "previous", not "origin": the bay is reachable from the hero,
                the nav and a project's own page, so back means undo the last
                move — not walk out to a listing the visitor never saw. The
                wipe runs in reverse so leaving retraces the way in. */}
            <BackLink
              mode="previous"
              slide="left"
              fallbackHref="/"
              fallbackLabel="Back to deck"
            />

            <span className="hidden whitespace-nowrap font-mono text-[11px] tracking-[0.14em] text-signal sm:inline">
              DEPLOYMENT BAY
            </span>
            <div className="flex items-center gap-4">
              <span className="whitespace-nowrap font-mono text-[11px] tabular-nums tracking-[0.12em] text-telemetry">
                {String(units.length).padStart(2, "0")}
                <span className="hidden sm:inline"> UNITS ONLINE</span>
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <ProductDeck units={units} />
      </div>
    </>
  );
}
