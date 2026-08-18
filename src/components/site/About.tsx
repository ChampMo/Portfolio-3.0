import type { IdentityDoc } from "@/models/Identity";
import SectionHead from "./SectionHead";
import Slideshow from "./Slideshow";
import CountUp from "./CountUp";
import SplitText from "./SplitText";
import { safeUrl } from "@/lib/content/url";
import ScrollOpen from "./ScrollOpen";

type Row = {
  key: string;
  value: string;
  /** Rendered in the telemetry colour — reserved for the live/at-a-glance values. */
  highlight?: boolean;
  /** Animate from zero when the row scrolls into view. */
  count?: boolean;
  logo?: string;
};

export default function About({ identity }: { identity: IdentityDoc | null }) {
  const s = identity?.sections?.about;
  const edu = identity?.education;
  const media = identity?.media;
  const slides = media?.slideshowImages ?? [];
  const fullName =
    `${identity?.profile.firstName ?? ""} ${identity?.profile.lastName ?? ""}`.trim() ||
    "Profile photo";

  // A document only appears if it has a URL *and* its visibility toggle is on.
  // The live résumé is the exception: it is a page on this site built from the
  // same database, so there is nothing to upload and nothing to hide.
  type Doc = { label: string; href: string; on: boolean; internal?: boolean };
  const docs: Doc[] = [
    { label: "Live résumé", href: "/resume", on: true, internal: true },
    { label: "Resume / CV", href: safeUrl(media?.cvUrl), on: Boolean(media?.cvVisible) },
    {
      label: "Transcript",
      href: safeUrl(media?.transcriptUrl),
      on: Boolean(media?.transcriptVisible),
    },
  ].filter((d) => Boolean(d.href && d.on));

  const rows: Row[] = [
    { key: "Program", value: edu?.major || "—" },
    {
      key: "Institute",
      value: edu?.universityName || edu?.universityShort || "—",
      logo: edu?.universityLogo || "",
    },
    {
      key: "Term",
      value: edu?.timelineStart
        ? `${edu.timelineStart} — ${edu.timelineEnd || "Present"}`
        : "—",
    },
    { key: "GPA", value: edu?.gpax || "—", highlight: true, count: true },
    { key: "Base", value: identity?.contact.address || "—" },
    {
      key: "Status",
      value: identity?.availability.isOpen
        ? identity.availability.label
        : "Not available",
      highlight: true,
    },
  ];

  const body = s?.body || identity?.profile.intro || "";

  return (
    <section id="about" className="relative mx-auto max-w-[1240px] px-[var(--pad-x)] py-36">
      <span className="ghost-num" data-px="0.16" aria-hidden="true">01</span>

      <div className="relative z-[1]">
        <SectionHead index="01" eyebrow={s?.eyebrow || "Identity"} />

        {/* Heading spans the full width for impact; the columns below split
            the portrait from the prose so a tall image can never squeeze the
            paragraph's measure the way a side-by-side layout does. */}
        <SplitText
          as="h3"
          text={s?.lead || "Fourth-year student, full-stack builder"}
          className="mb-11 block max-w-[20ch] font-display text-[clamp(2.2rem,5vw,3.8rem)] uppercase leading-[0.9]"
        />

        <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.55fr)]">
          {/* ── left: portrait, stretches to match the column beside it ── */}
          {slides.length > 0 ? (
            <div className="lg:h-full" data-reveal>
              <Slideshow
                images={slides}
                alt={`${fullName} — gallery`}
                frameClassName="aspect-[4/5] lg:aspect-auto lg:min-h-[560px]"
              />
            </div>
          ) : null}

          {/* ── right: prose, documents, spec readout ── */}
          <div className="flex min-w-0 flex-col gap-8">
            {body ? (
              <p
                className="max-w-[60ch] whitespace-pre-line text-[17px] leading-[1.8] text-ink-muted"
                data-reveal
              >
                {body}
              </p>
            ) : null}

            {docs.length > 0 ? (
              <div className="flex flex-wrap gap-3" data-reveal>
                {docs.map((doc) => (
                  <a
                    key={doc.label}
                    href={doc.href}
                    // Uploaded files open in a new tab; a route on this site
                    // navigates in place like any other link.
                    target={doc.internal ? undefined : "_blank"}
                    rel={doc.internal ? undefined : "noopener noreferrer"}
                    data-cursor="OPEN"
                    className="group inline-flex items-center gap-2.5 rounded-full border border-grid px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-signal hover:text-signal"
                  >
                    {doc.label}
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    >
                      &#8599;
                    </span>
                  </a>
                ))}
              </div>
            ) : null}

            {/* The spec sheet wipes open left to right as it is scrolled to,
                rather than just fading in — a readout deploying, which is what
                it is dressed as. `data-px` stays off this one: the parallax
                loop writes `transform` on those elements every frame. */}
            <ScrollOpen className="mt-auto overflow-hidden rounded-card border border-grid bg-panel">
              <div className="flex items-center justify-between border-b border-grid px-[18px] py-3 font-mono text-[10px] tracking-[0.16em] text-ink-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="status-dot" aria-hidden="true" />
                  SPEC SHEET
                </span>
                <span className="tabular-nums">REV {new Date().getFullYear()}.1</span>
              </div>

              {rows.map((row) => (
                <div
                  key={row.key}
                  className="group relative flex items-center justify-between gap-4 border-b border-grid px-[18px] py-[13px] text-sm transition-colors last:border-b-0 hover:bg-panel-2"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[2px] origin-center scale-y-0 bg-signal transition-transform duration-300 group-hover:scale-y-100"
                  />
                  <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                    {row.key}
                  </span>
                  <span
                    className={`flex items-center justify-end gap-2.5 text-right tabular-nums ${
                      row.highlight ? "font-mono text-[13px] text-telemetry" : ""
                    }`}
                  >
                    {row.logo ? (
                      // A detailed crest is illegible at inline text size, and
                      // its colours have no guaranteed contrast against either
                      // theme's ground. Sitting it on its own light plate is
                      // the standard way to place a multi-colour logo on an
                      // arbitrary background.
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white p-1 ring-1 ring-grid">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={row.logo} alt="" className="size-full object-contain" />
                      </span>
                    ) : null}
                    {row.count ? <CountUp value={row.value} /> : row.value}
                  </span>
                </div>
              ))}
            </ScrollOpen>
          </div>
        </div>
      </div>
    </section>
  );
}
