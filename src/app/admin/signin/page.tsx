import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth/guard";
import { allowedEmails } from "@/lib/auth/allowlist";
import { safeAdminPath } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SignInPage(props: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  // Next 16: searchParams is a Promise and must be awaited.
  const { error, next } = await props.searchParams;

  // `proxy.ts` appends the page the visitor was bounced away from. It was
  // being written and never read, so everyone landed on /admin regardless.
  const target = safeAdminPath(next);
  const signInHref = target
    ? `/api/auth/login?next=${encodeURIComponent(target)}`
    : "/api/auth/login";

  if (await getAdmin()) redirect("/admin");

  const misconfigured = allowedEmails().length === 0;

  return (
    <main className="min-h-svh grid place-items-center px-6 py-16">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-baseline gap-3">
          <span className="font-mono text-[11px] tracking-[0.24em] text-signal">
            SIGNAL
          </span>
          <span className="h-px flex-1 bg-grid" />
          <span className="font-mono text-[10px] tracking-[0.16em] text-ink-muted">
            RESTRICTED
          </span>
        </div>

        <div className="rounded-[14px] border border-grid bg-panel p-8">
          <h1 className="font-display text-[2.4rem] leading-[0.95] uppercase">
            Admin access
          </h1>
          <p className="mt-3 mb-8 text-sm leading-relaxed text-ink-muted">
            Sign in with an approved Google account to manage the portfolio
            content.
          </p>

          {error ? (
            <p
              role="alert"
              className="mb-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-danger"
            >
              {error}
            </p>
          ) : null}

          {misconfigured ? (
            <p
              role="alert"
              className="mb-6 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-warn"
            >
              ADMIN_ALLOWED_EMAILS is empty — every sign-in will be refused. Set
              it in .env.local and restart.
            </p>
          ) : null}

          <a
            href={signInHref}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-signal px-6 py-3.5 font-mono text-[12px] tracking-[0.1em] uppercase transition-colors hover:bg-signal hover:text-on-signal"
          >
            <GoogleMark />
            Continue with Google
          </a>

          <p className="mt-6 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-ink-muted">
            Only addresses on the allowlist can sign in. Everyone else is
            refused before any account record is created.
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          &larr; Back to site
        </Link>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5h-1.9V20H24v8h11.3A12 12 0 1 1 24 12c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.9 41.2 44 36 44 24a20 20 0 0 0-.4-3.5Z"
      />
    </svg>
  );
}
