"use client";

import { Printer } from "lucide-react";

/** `window.print()` needs a client component; everything else here is static. */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-cursor="PRINT"
      className="inline-flex items-center gap-2 rounded-full border border-signal bg-signal px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-on-signal transition-opacity hover:opacity-85"
    >
      <Printer size={12} aria-hidden="true" />
      Print / Save PDF
    </button>
  );
}
