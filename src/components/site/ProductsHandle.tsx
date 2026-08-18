"use client";

import Link from "next/link";
import { slideTo } from "./SlideTransition";

/**
 * Drawer pull on the right edge of the hero.
 *
 * The products are the only thing on this site a stranger can act on
 * immediately — open it, download it — so they get the one position everyone
 * sees. Putting them after the contact section would have buried them at the
 * least-visited point on the page *and* stolen the closing ask.
 *
 * A vertical handle rather than another pill button: the hero already carries
 * two calls to action, and a third of the same shape would just dilute both.
 * A tab hanging off the edge reads as "there is something over there", which
 * is exactly the claim being made.
 */
export default function ProductsHandle() {
  return (
    <Link
      href="/products"
      data-cursor="LAUNCH"
      onClick={(e) => {
        // Left the anchor intact so middle-click and keyboard still open the
        // route normally; only the plain click is taken over.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        slideTo("/products", "right");
      }}
      aria-label="Products — apps you can use and download"
      className="products-handle group hidden lg:flex"
    >
      <span className="products-handle-dot" aria-hidden="true" />
      <span className="products-handle-text">PRODUCTS</span>
      <span aria-hidden="true" className="products-handle-arrow">
        &rsaquo;
      </span>
    </Link>
  );
}
