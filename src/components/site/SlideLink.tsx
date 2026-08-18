"use client";

import Link from "next/link";
import { slideTo, type SlideDetail } from "./SlideTransition";

/**
 * A link that navigates behind the bulkhead wipe.
 *
 * Still a real anchor — middle-click, "open in new tab" and the keyboard all
 * behave normally, and it works with JavaScript off. Only the plain left click
 * is taken over.
 */
export default function SlideLink({
  href,
  from = "right",
  className = "",
  children,
  ...rest
}: {
  href: string;
  from?: SlideDetail["from"];
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        slideTo(href, from);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
