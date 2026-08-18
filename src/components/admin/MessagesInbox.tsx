"use client";

import { useMemo, useState } from "react";
import { Mail, MailOpen, Trash2, AlertTriangle, Reply, Inbox } from "lucide-react";
import type { MessageDoc } from "@/models/Message";
import { PageHead, Panel, Button } from "./ui";

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Inbox for contact-form submissions.
 *
 * Every message also carries whether its notification email went out. A row
 * marked "not mailed" is one the site received but never told anyone about —
 * the exact failure this page exists to make visible.
 */
export default function MessagesInbox({ initial }: { initial: MessageDoc[] }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<string | null>(initial[0]?._id ?? null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [busy, setBusy] = useState(false);

  const unread = items.filter((m) => !m.read).length;
  const shown = useMemo(
    () => (onlyUnread ? items.filter((m) => !m.read) : items),
    [items, onlyUnread]
  );
  const current = items.find((m) => m._id === selected) ?? null;

  async function setRead(id: string, read: boolean) {
    // Optimistic: the toggle is the whole interaction, so waiting on the
    // round-trip before moving the dot would make it feel broken.
    setItems((prev) => prev.map((m) => (m._id === id ? { ...m, read } : m)));
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    }).catch(() => {});
  }

  async function remove(id: string) {
    const m = items.find((x) => x._id === id);
    if (!m) return;
    if (!window.confirm(`Delete the message from ${m.name}? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return;
    setItems((prev) => {
      const next = prev.filter((x) => x._id !== id);
      setSelected((sel) => (sel === id ? (next[0]?._id ?? null) : sel));
      return next;
    });
  }

  function open(id: string) {
    setSelected(id);
    const m = items.find((x) => x._id === id);
    if (m && !m.read) void setRead(id, true);
  }

  return (
    <div>
      <PageHead
        index="06"
        title="Inbox"
        lead={
          items.length === 0
            ? "Contact messages"
            : `${items.length} message${items.length === 1 ? "" : "s"}${unread ? ` · ${unread} unread` : ""}`
        }
        action={
          items.length > 0 ? (
            <Button onClick={() => setOnlyUnread((v) => !v)}>
              {onlyUnread ? "Show all" : "Unread only"}
            </Button>
          ) : null
        }
      />

      {items.length === 0 ? (
        <p className="flex items-center gap-3 rounded-card border border-grid bg-panel p-6 text-sm leading-relaxed text-ink-muted">
          <Inbox size={16} aria-hidden="true" className="shrink-0" />
          No messages yet. Anything sent through the contact form lands here —
          and stays here even if the notification email fails to send.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
          <ul className="admin-list flex max-h-[70svh] list-none flex-col gap-1.5 overflow-y-auto p-0">
            {shown.map((m) => {
              const on = m._id === selected;
              return (
                <li key={m._id}>
                  <button
                    type="button"
                    onClick={() => open(m._id)}
                    aria-current={on ? "true" : undefined}
                    className={`flex w-full flex-col gap-1 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                      on
                        ? "border-signal bg-panel-2"
                        : "border-grid bg-panel hover:border-ink-muted"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {m.read ? (
                        <MailOpen size={12} aria-hidden="true" className="shrink-0 text-ink-muted/40" />
                      ) : (
                        <span
                          aria-label="Unread"
                          className="size-1.5 shrink-0 rounded-full bg-signal"
                        />
                      )}
                      <span
                        className={`min-w-0 flex-1 truncate font-mono text-[11px] tracking-[0.06em] ${
                          m.read ? "text-ink-muted" : "text-ink"
                        }`}
                      >
                        {m.name}
                      </span>
                      {!m.mailed ? (
                        <AlertTriangle
                          size={11}
                          aria-label="Notification email failed"
                          className="shrink-0 text-warn"
                        />
                      ) : null}
                    </span>
                    <span className="truncate text-[11px] leading-relaxed text-ink-muted/70">
                      {m.body}
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.1em] text-ink-muted/50">
                      {when(m.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 ? (
              <li className="rounded-lg border border-grid bg-panel px-3.5 py-4 text-[11px] text-ink-muted">
                Nothing unread.
              </li>
            ) : null}
          </ul>

          {current ? (
            <Panel title={`From ${current.name}`}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                      Email
                    </span>
                    <a
                      href={`mailto:${current.email}`}
                      className="break-all font-mono text-[12px] text-telemetry hover:text-signal"
                    >
                      {current.email}
                    </a>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                      Received
                    </span>
                    <span className="font-mono text-[12px] text-ink">
                      {when(current.createdAt)}
                    </span>
                  </div>
                </div>

                {!current.mailed ? (
                  <p
                    role="status"
                    className="flex items-start gap-3 rounded-card border border-warn/40 bg-warn/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-warn"
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    The notification email for this message did not send. The
                    message itself was saved — check the SMTP settings.
                  </p>
                ) : null}

                <p className="whitespace-pre-line rounded-card border border-grid bg-ground p-4 text-[14px] leading-[1.8] text-ink">
                  {current.body}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`mailto:${current.email}?subject=${encodeURIComponent(
                      "Re: your message"
                    )}`}
                    className="inline-flex items-center gap-2 rounded-full border border-signal px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal hover:text-on-signal"
                  >
                    <Reply size={12} aria-hidden="true" />
                    Reply
                  </a>
                  <Button onClick={() => setRead(current._id, !current.read)}>
                    <span className="inline-flex items-center gap-2">
                      <Mail size={12} aria-hidden="true" />
                      Mark {current.read ? "unread" : "read"}
                    </span>
                  </Button>
                  <Button variant="danger" onClick={() => remove(current._id)}>
                    <span className="inline-flex items-center gap-2">
                      <Trash2 size={12} aria-hidden="true" />
                      {busy ? "Deleting…" : "Delete"}
                    </span>
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </div>
  );
}
