import { ArrowRight, Download } from "lucide-react";
import type { ProductDoc } from "@/models/Product";
import { PLATFORM_LABEL } from "@/lib/github/release";
import SlideLink from "./SlideLink";

/**
 * "This one shipped" — the return leg of the products link.
 *
 * The Deployment Bay already sends people here to read how something was
 * built; without this the trip only ran one way, and the reader most likely to
 * install an app is the one who just finished reading why it exists.
 *
 * Deliberately the loudest thing in the spec rail. Everything else on this
 * page is evidence; this is the only control that hands the visitor the actual
 * software, so it outranks the repository link sitting under it.
 */
export default function ShippedCallout({ product }: { product: ProductDoc }) {
  return (
    <SlideLink
      // Straight to this product's own unit rather than the front of the deck.
      href={product.slug ? `/products#${product.slug}` : "/products"}
      from="right"
      data-cursor="LAUNCH"
      className="group mt-3 block overflow-hidden rounded-card border border-signal/50 bg-signal/[0.07] transition-colors hover:border-signal"
    >
      <span className="flex items-center justify-between gap-3 border-b border-signal/25 px-[18px] py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
        <span className="inline-flex items-center gap-2">
          <Download size={11} aria-hidden="true" />
          Shipped
        </span>
        <span className="tabular-nums opacity-70">
          {product.status.replace("_", " ")}
        </span>
      </span>

      <span className="flex items-center gap-3 px-[18px] py-4">
        {product.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.icon}
            alt=""
            className="size-11 shrink-0 rounded-[10px] border border-grid object-cover"
          />
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[1.4rem] uppercase leading-none">
            {product.name}
          </span>
          {product.tagline ? (
            <span className="mt-1 block truncate text-[12px] leading-snug text-ink-muted">
              {product.tagline}
            </span>
          ) : null}
        </span>

        <ArrowRight
          size={15}
          aria-hidden="true"
          className="shrink-0 text-signal transition-transform group-hover:translate-x-1"
        />
      </span>

      <span className="flex flex-wrap gap-1.5 px-[18px] pb-4">
        {product.platforms.map((p) => (
          <span
            key={p}
            className="rounded-full border border-grid px-2.5 py-[4px] font-mono text-[9px] uppercase tracking-[0.08em] text-ink-muted"
          >
            {PLATFORM_LABEL[p] ?? p}
          </span>
        ))}
        <span className="px-1 py-[4px] font-mono text-[9px] uppercase tracking-[0.08em] text-signal">
          Use it &rarr;
        </span>
      </span>
    </SlideLink>
  );
}
