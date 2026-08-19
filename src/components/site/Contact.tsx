import type { IdentityDoc } from "@/models/Identity";
import ContactForm from "./ContactForm";
import CopyEmail from "./CopyEmail";
import { safeHref } from "@/lib/content/url";

const SOCIALS: Array<[keyof IdentityDoc["socials"], string]> = [
  ["github", "GitHub"],
  ["linkedin", "LinkedIn"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
];

export default function Contact({ identity }: { identity: IdentityDoc | null }) {
  const s = identity?.sections?.contact;
  const email = identity?.contact.email || "";
  const phone = identity?.contact.phone || "";
  const socials = identity?.socials;
  const lead = s?.lead || "Let's build something";
  const [leadA, ...leadRest] = lead.split(" ");

  return (
    <section
      id="contact"
      className="relative overflow-hidden border-t border-grid px-[var(--pad-x)] py-24 md:py-44 text-center"
    >
      <div className="grid-bg !inset-[-10%] opacity-40" data-px="0.06" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(660px,90vw)] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <div className="radar-rings" />
        <div className="radar-sweep" />
      </div>

      <div className="relative z-[2]">
        <div
          className="mb-9 inline-flex items-center gap-[9px] rounded-full border border-grid px-4 py-[7px] font-mono text-[11px] tracking-[0.1em] text-ink-muted"
          data-reveal
        >
          <span className="status-dot" aria-hidden="true" />
          {(s?.eyebrow || "Channel open").toUpperCase()}
        </div>

        <h2
          className="mx-auto mb-6 font-display text-[clamp(2.6rem,7vw,5.5rem)] uppercase leading-[0.9] text-balance"
          data-reveal
        >
          <span className="block" data-px="-0.07">{leadA}</span>
          <span className="block text-signal" data-px="0.07">{leadRest.join(" ")}</span>
        </h2>

        {s?.body ? (
          <p className="mx-auto mb-10 max-w-[48ch] text-base leading-relaxed text-ink-muted" data-reveal>
            {s.body}
          </p>
        ) : null}

        <div data-reveal>
          <ContactForm />
        </div>

        <div
          className="mt-11 flex flex-wrap justify-center gap-7 font-mono text-[11px] tracking-[0.1em] text-ink-muted"
          data-reveal
        >
          {email ? <CopyEmail email={email} /> : null}
          {phone ? <span>{phone}</span> : null}
          {SOCIALS.map(([key, label]) => {
            const href = safeHref(socials?.[key]);
            if (!href) return null;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor={label.slice(0, 2).toUpperCase()}
                className="uppercase transition-colors hover:text-signal"
              >
                {label}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
