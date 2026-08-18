"use client";

import { useState } from "react";
import Magnetic from "./Magnetic";

type State = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      company: String(data.get("company") ?? ""), // honeypot
    };

    // Validate before showing a spinner, so mistakes surface instantly.
    if (!payload.name) return fail("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
      return fail("Please enter a valid email address.");
    if (payload.message.length < 10)
      return fail("Please write a slightly longer message.");

    setState("sending");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return fail(body.error || "Could not send. Please try again.");
      setState("sent");
      form.reset();
    } catch {
      fail("Network error. Please try again.");
    }
  }

  function fail(message: string) {
    setError(message);
    setState("error");
  }

  if (state === "sent") {
    return (
      <p
        role="status"
        className="mx-auto max-w-[420px] rounded-card border border-signal/40 bg-signal/10 px-5 py-4 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-signal"
      >
        MESSAGE RECEIVED — I&rsquo;ll get back to you soon.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-[460px] text-left">
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-3">
        <Field name="name" label="Name" type="text" autoComplete="name" />
        <Field name="email" label="Email" type="email" autoComplete="email" />
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            Message
          </span>
          <textarea
            name="message"
            rows={4}
            required
            className="resize-y rounded-card border border-grid bg-panel px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-signal"
            placeholder="What are you working on?"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-3 font-mono text-[11px] leading-relaxed text-danger">
          {error}
        </p>
      ) : null}

      <Magnetic className="mt-5 w-full">
      <button
        type="submit"
        data-cursor="SEND"
        disabled={state === "sending"}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-signal px-7 py-3.5 font-mono text-[12px] uppercase tracking-[0.1em] transition-colors hover:bg-signal hover:text-on-signal disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-ink"
      >
        {state === "sending" ? "Transmitting…" : "Send message"}
        {state === "sending" ? null : <span aria-hidden="true">&rarr;</span>}
      </button>
      </Magnetic>
    </form>
  );
}

function Field({
  name,
  label,
  type,
  autoComplete,
}: {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="rounded-card border border-grid bg-panel px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-signal"
      />
    </label>
  );
}
