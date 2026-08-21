import type { Metadata } from "next";
import localFont from "next/font/local";
import ThemeInit from "@/components/ThemeInit";
import PreloadInit from "@/components/PreloadInit";
import RouteTrail from "@/components/site/RouteTrail";
import SlideTransition from "@/components/site/SlideTransition";
import { siteUrl } from "@/lib/site/url";
import "./globals.css";

/* Self-hosted so the page never flashes a fallback face, and so the CSP-free
   Google Fonts round-trip is dropped entirely. Latin subset only. */
const bigShoulders = localFont({
  src: "./fonts/BigShouldersDisplay-Bold.woff2",
  variable: "--font-big-shoulders",
  weight: "700",
  display: "swap",
});

const publicSans = localFont({
  src: [
    { path: "./fonts/PublicSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/PublicSans-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-public-sans",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Medium.woff2",
  variable: "--font-jetbrains-mono",
  weight: "500",
  display: "swap",
});

const TITLE = "Monthol Sukjinda — Full-Stack Developer";
const DESCRIPTION =
  "Portfolio of Monthol Sukjinda (Champ), a full-stack developer based in Bangkok, Thailand.";

export const metadata: Metadata = {
  // Required before any relative URL below — including the generated
  // `opengraph-image` paths — can be resolved into the absolute ones that
  // social crawlers demand.
  metadataBase: new URL(siteUrl),
  title: { default: TITLE, template: "%s" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Signal Deck",
    locale: "en_US",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // Declares the smooth scrolling that globals.css already sets, so the
      // router can suppress it during route transitions instead of animating
      // the jump to the top of every new page.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* The font variables live here rather than on <html>, and that is the
          whole point of this line.

          The theme is applied by writing `light` or `dark` onto <html> before
          first paint — a class React knows nothing about. While React also
          owned <html>'s `className`, any re-render of the root could reapply
          its own value and take the theme class with it: the admin came back
          from a reload with a stored preference of "light", an <html> carrying
          nothing but the three font classes, and a page rendered dark from the
          OS default. The public pages happened to survive it; the admin, which
          streams behind an auth check and a database read, did not.

          Everything inherits from <body>, and `body` is where the base
          font-family is declared, so nothing loses its typeface. But <html> is
          now nobody's to rewrite except the theme script's. */}
      <body
        className={`${bigShoulders.variable} ${publicSans.variable} ${jetbrainsMono.variable}`}
      >
        <ThemeInit />
        <PreloadInit />
        <RouteTrail />
        <SlideTransition />
        {children}
      </body>
    </html>
  );
}
