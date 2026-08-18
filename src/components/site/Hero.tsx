import type { IdentityDoc } from "@/models/Identity";
import LiveClock from "./LiveClock";
import Magnetic from "./Magnetic";
import PaletteHint from "./PaletteHint";
import ProductsHandle from "./ProductsHandle";

/** Splits a word into per-character spans for the staggered rise-in. */
function SplitName({ text, id, base }: { text: string; id: string; base: number }) {
  return (
    <span className="name-line" id={id} aria-hidden="true">
      {text.split("").map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="name-ch"
          style={{ ["--d" as string]: `${(base + i * 0.035).toFixed(3)}s` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

export default function Hero({ identity }: { identity: IdentityDoc | null }) {
  const first = (identity?.profile.firstName || "Monthol").toUpperCase();
  const last = (identity?.profile.lastName || "Sukjinda").toUpperCase();
  const role = identity?.profile.role || "Full-Stack Developer";
  const nickname = identity?.profile.nickname || "";
  const motto = identity?.profile.motto || "";
  const lat = identity?.contact.latitude || "13.7563";
  const lng = identity?.contact.longitude || "100.5018";
  const tz = identity?.contact.timezone || "Asia/Bangkok";
  const open = identity?.availability.isOpen ?? true;
  const availLabel = identity?.availability.label || "Open to work";
  const avatar = identity?.media?.avatar || "";
  const fullName = `${first} ${last}`.trim().toLowerCase();

  return (
    <div className="hero-wrap">
      <section className="hero-stage" id="hero">
        <div className="grid-bg" id="hero-grid" aria-hidden="true" />
        <div className="scanline" aria-hidden="true" />

        <span className="bracket boot border-t border-l" style={{ top: 88, left: 24, ["--d" as string]: ".15s" }} aria-hidden="true" />
        <span className="bracket boot border-t border-r" style={{ top: 88, right: 24, ["--d" as string]: ".22s" }} aria-hidden="true" />
        <span className="bracket boot border-b border-l" style={{ bottom: 24, left: 24, ["--d" as string]: ".29s" }} aria-hidden="true" />
        <span className="bracket boot border-b border-r" style={{ bottom: 24, right: 24, ["--d" as string]: ".36s" }} aria-hidden="true" />

        <aside
          id="hero-telemetry"
          aria-hidden="true"
          className="absolute left-7 top-1/2 z-[2] hidden -translate-y-1/2 flex-col gap-[13px] font-mono text-[11px] tracking-[0.08em] tabular-nums text-ink-muted md:flex"
        >
          <span className="boot" style={{ ["--d" as string]: ".45s" }} data-scramble>{lat}&deg;N</span>
          <span className="boot text-telemetry" style={{ ["--d" as string]: ".52s" }} data-scramble>{lng}&deg;E</span>
          <span className="boot h-px w-[18px] bg-grid" style={{ ["--d" as string]: ".56s" }} />
          <span className="boot" style={{ ["--d" as string]: ".6s" }} data-scramble>
            STATUS &mdash; {open ? "ACTIVE" : "STANDBY"}
          </span>
          <LiveClock timezone={tz} />
          <span className="boot h-px w-[18px] bg-grid" style={{ ["--d" as string]: ".71s" }} />
          <span className="boot" style={{ ["--d" as string]: ".75s" }} data-scramble>BKK / TH</span>
        </aside>

        <div className="hero-inner">
        <div id="hero-content" className="relative z-[2] max-w-[780px] md:ml-[68px]">
          <div
            className="boot mb-9 inline-flex items-center gap-[9px] rounded-full border border-grid px-4 py-[7px] font-mono text-[11px] tracking-[0.1em] text-ink-muted"
            style={{ ["--d" as string]: "1.55s" }}
          >
            <span className="status-dot" aria-hidden="true" />
            SIGNAL &mdash; {availLabel.toUpperCase()}
          </div>

          <h1
            className="mb-6 font-display text-[clamp(3.1rem,8.6vw,7.4rem)] uppercase leading-[0.86] tracking-[-0.01em]"
            aria-label={`${identity?.profile.firstName ?? "Monthol"} ${identity?.profile.lastName ?? "Sukjinda"}`}
          >
            <SplitName text={first} id="hero-name-a" base={0.75} />
            <span className="text-signal">
              <SplitName text={last} id="hero-name-b" base={0.88} />
            </span>
          </h1>

          <div className="boot mb-6 flex flex-wrap items-center gap-4" style={{ ["--d" as string]: "1.35s" }}>
            <span className="font-mono text-[13px] tracking-[0.14em] uppercase">{role}</span>
            <span aria-hidden="true" className="h-px w-9 bg-grid" />
            {nickname ? (
              <span className="text-sm font-semibold text-ink-muted">&ldquo;{nickname}&rdquo;</span>
            ) : null}
          </div>

          {motto ? (
            <p className="boot mb-11 max-w-[44ch] text-[17px] leading-relaxed text-ink-muted" style={{ ["--d" as string]: "1.45s" }}>
              {motto}
            </p>
          ) : null}

          <div className="boot flex flex-wrap items-center gap-[18px]" style={{ ["--d" as string]: "1.65s" }}>
            <Magnetic>
              <a
                href="#work"
                data-cursor="OPEN"
                className="inline-flex items-center gap-[10px] rounded-full border border-signal px-[26px] py-3.5 font-mono text-[12px] uppercase tracking-[0.1em] transition-colors hover:bg-signal hover:text-on-signal"
              >
                View transmission log <span aria-hidden="true">&rarr;</span>
              </a>
            </Magnetic>
            <a
              href="#contact"
              data-cursor="MAIL"
              className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-muted underline decoration-grid underline-offset-4 transition-colors hover:text-ink hover:decoration-signal"
            >
              Open a channel
            </a>
          </div>
        </div>

        {avatar ? (
          <div
            className="boot pointer-events-none absolute right-30 top-1/2 z-[1] hidden w-[clamp(220px,22vw,320px)] -translate-y-1/2 lg:block"
            style={{ ["--d" as string]: "1.2s" }}
            data-px="0.08"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] transition-transform will-change-transform hover:scale-[1.02]">
              {/* Arbitrary remote host — next/image would need every possible
                  upload domain declared in remotePatterns. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} alt={fullName} className="size-full object-cover" />
              {/* Fades the portrait into the ground so it reads as a layer of
                  the scene rather than a pasted-on photo. */}
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent 55%, var(--ground) 100%)",
                }}
              />
            </div>
            <span className="mt-3 block text-right font-mono text-[9px] tracking-[0.16em] text-ink-muted">
              OPERATOR &mdash; {fullName.toUpperCase()}
            </span>
          </div>
        ) : null}

        </div>

        <ProductsHandle />

        <div
          className="boot absolute bottom-7 left-[var(--pad-x)] z-[3] hidden md:block"
          style={{ ["--d" as string]: "1.95s" }}
        >
          <PaletteHint />
        </div>

        <div
          className="boot absolute bottom-7 right-7 z-[2] hidden flex-col items-center gap-2.5 font-mono text-[10px] tracking-[0.16em] text-ink-muted md:flex"
          style={{ ["--d" as string]: "1.85s" }}
          aria-hidden="true"
        >
          <span>SCROLL</span>
          <span className="h-10 w-px bg-grid" />
        </div>
      </section>
    </div>
  );
}
