"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminIdentity } from "@/lib/auth/guard";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/admin", label: "Overview", code: "00" },
  { href: "/admin/identity", label: "Identity", code: "01" },
  { href: "/admin/skills", label: "Tech Forge", code: "02" },
  { href: "/admin/services", label: "Service Bay", code: "03" },
  { href: "/admin/projects", label: "Archives", code: "04" },
  { href: "/admin/experience", label: "Mission Log", code: "05" },
  { href: "/admin/products", label: "Deployment Bay", code: "06" },
  { href: "/admin/messages", label: "Inbox", code: "07" },
];

export default function AdminShell({
  admin,
  unread = 0,
  children,
}: {
  admin: AdminIdentity;
  /** Unread contact messages, badged on the Inbox link. */
  unread?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut(everywhere: boolean) {
    setBusy(true);
    await fetch(`/api/auth/logout${everywhere ? "?all=1" : ""}`, {
      method: "POST",
    });
    // refresh() discards the cached server render that still assumes a session,
    // so the protected layout re-evaluates against the now-cleared cookie.
    router.replace("/admin/signin");
    router.refresh();
  }

  return (
    <div className="min-h-svh md:grid md:grid-cols-[248px_1fr]">
      <aside className="border-b border-grid bg-panel md:sticky md:top-0 md:h-svh md:border-r md:border-b-0 md:overflow-y-auto">
        <div className="flex items-center justify-between border-b border-grid px-5 py-4">
          <span className="font-mono text-[11px] tracking-[0.24em] text-signal">
            SIGNAL
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.14em] text-ink-muted">
              ADMIN
            </span>
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex overflow-x-auto md:flex-col md:overflow-visible">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 whitespace-nowrap border-grid px-5 py-3.5 font-mono text-[11px] tracking-[0.1em] transition-colors md:border-b ${
                  active
                    ? "bg-panel-2 text-ink"
                    : "text-ink-muted hover:bg-panel-2 hover:text-ink"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 h-full w-[2px] transition-transform ${
                    active ? "scale-y-100 bg-signal" : "scale-y-0 bg-transparent"
                  }`}
                />
                <span className={active ? "text-signal" : ""}>{item.code}</span>
                <span className="uppercase">{item.label}</span>
                {item.href === "/admin/messages" && unread > 0 ? (
                  <span
                    aria-label={`${unread} unread`}
                    className="ml-auto min-w-[18px] rounded-full bg-signal px-1.5 py-0.5 text-center text-[9px] tabular-nums text-on-signal"
                  >
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-grid px-5 py-4 md:mt-auto">
          <p className="truncate font-mono text-[10px] tracking-[0.08em] text-ink-muted">
            {admin.email}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => signOut(false)}
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted underline underline-offset-4 hover:text-signal disabled:opacity-50"
            >
              Sign out
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => signOut(true)}
              title="Invalidates every session issued to this account"
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted underline underline-offset-4 hover:text-danger disabled:opacity-50"
            >
              All devices
            </button>
          </div>
          <Link
            href="/"
            className="mt-3 inline-block font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted hover:text-ink"
          >
            View site &rarr;
          </Link>
        </div>
      </aside>

      <main className="min-w-0 px-6 pb-8 md:px-10 md:pb-12">{children}</main>
    </div>
  );
}
