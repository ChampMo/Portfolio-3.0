"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CornerDownLeft,
  FolderOpen,
  Compass,
  SunMoon,
  FileText,
  Command as CommandIcon,
  ShieldCheck,
  Package,
} from "lucide-react";
import { THEME_STORAGE_KEY } from "@/components/ThemeInit";
import { runThemeWipe } from "@/lib/site/themeWipe";
import { lockScroll } from "@/lib/site/scrollLock";
import { slideTo } from "./SlideTransition";

/** Lets any control on the page open the palette without owning its state. */
export const PALETTE_EVENT = "signal:palette";

type Entry = {
  id: string;
  label: string;
  hint: string;
  group: "Projects" | "Sections" | "Actions";
  keywords: string;
  run: () => void;
};

type ApiProject = {
  _id: string;
  name: string;
  slug?: string;
  summary?: string;
  tags?: string[];
  stack?: string[];
};

/** Per-action icons; anything unlisted falls back to a document. */
const ACTION_ICON: Record<string, typeof FileText> = {
  "a-theme": SunMoon,
  "a-admin": ShieldCheck,
  "a-products": Package,
};

const SECTIONS: Array<[string, string]> = [
  ["about", "Identity"],
  ["skills", "Tech Forge"],
  ["services", "Service Bay"],
  ["work", "Mission Archives"],
  ["log", "Mission Log"],
  ["contact", "Contact"],
];

/**
 * Keyboard entry point to everything on the site.
 *
 * The home page is one long scroll and the archive keeps growing, so the
 * fastest route to a specific project was becoming "scroll and look". This is
 * the shortcut, and it fits the console framing the rest of the site already
 * uses.
 *
 * Projects are fetched from the public API on first open rather than passed in
 * as props: that keeps this mountable on any page without every one of them
 * having to load and thread the list through.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const loaded = useRef(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setCursor(0);
  }, []);

  // ── open / close ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") close();
      // Bare "/" opens too, but not while the visitor is typing somewhere.
      if (e.key === "/" && !mod) {
        const el = document.activeElement;
        const typing =
          el instanceof HTMLElement &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.isContentEditable);
        if (!typing) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    const onRequest = () => setOpen(true);

    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_EVENT, onRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_EVENT, onRequest);
    };
  }, [close]);

  // ── project list, once ──
  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    (async () => {
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        const data = (await res.json()) as ApiProject[];
        if (Array.isArray(data)) setProjects(data);
      } catch {
        /* the palette still works for sections and actions */
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return lockScroll();
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const go = (href: string) => () => {
      close();
      router.push(href);
    };

    const jump = (id: string) => () => {
      close();
      // Anchors only exist on the home page; from anywhere else the hash has
      // to travel with the navigation.
      if (window.location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push(`/#${id}`);
      }
    };

    return [
      ...projects
        .filter((p) => p.slug && p._id)
        .map<Entry>((p) => ({
          id: `p-${p._id}`,
          label: p.name,
          hint: p.summary?.slice(0, 60) || "Project",
          group: "Projects",
          keywords: [p.name, p.summary, ...(p.tags ?? []), ...(p.stack ?? [])]
            .filter(Boolean)
            .join(" "),
          run: go(`/work/${p.slug}`),
        })),
      ...SECTIONS.map<Entry>(([id, label]) => ({
        id: `s-${id}`,
        label,
        hint: `Section ${id}`,
        group: "Sections",
        keywords: `${label} ${id}`,
        run: jump(id),
      })),
      {
        id: "a-archive",
        label: "Browse all projects",
        hint: "/work",
        group: "Actions",
        keywords: "archive work projects all filter",
        run: go("/work"),
      },
      {
        id: "a-products",
        label: "Products",
        hint: "/products",
        group: "Actions",
        keywords: "products apps download install software deployment bay",
        run: () => {
          close();
          slideTo("/products", "right");
        },
      },
      {
        id: "a-resume",
        label: "Open résumé",
        hint: "/resume",
        group: "Actions",
        keywords: "resume cv print pdf",
        run: go("/resume"),
      },
      {
        id: "a-admin",
        label: "Admin panel",
        hint: "/admin",
        group: "Actions",
        keywords: "admin dashboard cms manage edit sign in login backend",
        run: go("/admin"),
      },
      {
        id: "a-theme",
        label: "Toggle theme",
        hint: "Light / dark",
        group: "Actions",
        keywords: "theme dark light colour color",
        run: () => {
          close();
          const root = document.documentElement;
          const dark = root.classList.contains("dark")
            ? true
            : root.classList.contains("light")
              ? false
              : window.matchMedia("(prefers-color-scheme: dark)").matches;
          const next = dark ? "light" : "dark";
          runThemeWipe(null, () => {
            root.classList.remove("light", "dark");
            root.classList.add(next);
            try {
              localStorage.setItem(THEME_STORAGE_KEY, next);
            } catch {
              /* choice applies for this load only */
            }
          });
        },
      },
    ];
  }, [projects, router, close]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) =>
      `${e.label} ${e.keywords}`.toLowerCase().includes(needle)
    );
  }, [entries, q]);

  // Keep the highlight inside the result list as it shrinks.
  const active = Math.min(cursor, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, results.length]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 cursor-default bg-ground/85 backdrop-blur-[4px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="palette relative flex max-h-[70svh] w-[min(620px,100%)] flex-col overflow-hidden rounded-[16px] border border-grid bg-panel"
      >
        <div className="flex items-center gap-3 border-b border-grid px-5 py-4">
          <Search size={14} aria-hidden="true" className="shrink-0 text-signal" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(results.length - 1, c + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                results[active]?.run();
              }
            }}
            placeholder="Search projects, sections, actions…"
            aria-label="Search"
            className="w-full bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-ink-muted/50"
          />
          <kbd className="hidden shrink-0 rounded border border-grid px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-ink-muted sm:block">
            ESC
          </kbd>
        </div>

        <ul ref={listRef} className="m-0 flex-1 list-none overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              No signal for “{q}”
            </li>
          ) : null}

          {results.map((e, i) => {
            const header = e.group !== lastGroup ? e.group : null;
            lastGroup = e.group;
            const Icon =
              e.group === "Projects"
                ? FolderOpen
                : e.group === "Sections"
                  ? Compass
                  : ACTION_ICON[e.id] ?? FileText;

            return (
              <li key={e.id}>
                {header ? (
                  <p className="px-3 pb-1.5 pt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-muted/60">
                    {header}
                  </p>
                ) : null}
                <button
                  type="button"
                  data-active={i === active}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => e.run()}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    i === active ? "bg-panel-2" : "hover:bg-panel-2/60"
                  }`}
                >
                  <Icon
                    size={13}
                    aria-hidden="true"
                    className={`shrink-0 ${i === active ? "text-signal" : "text-ink-muted"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">{e.label}</span>
                    <span className="block truncate font-mono text-[10px] text-ink-muted">
                      {e.hint}
                    </span>
                  </span>
                  {i === active ? (
                    <CornerDownLeft
                      size={12}
                      aria-hidden="true"
                      className="shrink-0 text-ink-muted"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 border-t border-grid px-5 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <CommandIcon size={10} aria-hidden="true" />K to toggle
          </span>
          <span>&uarr;&darr; to move</span>
          <span>&crarr; to open</span>
        </div>
      </div>
    </div>
  );
}
