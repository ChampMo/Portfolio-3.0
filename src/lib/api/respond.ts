import { NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

/**
 * Logs the real error server-side but returns a generic message, so stack
 * traces and driver internals never reach the client.
 */
export function boom(err: unknown, context: string) {
  console.error(`[api] ${context}:`, err);
  return NextResponse.json(
    { error: "Something went wrong. Check the server logs." },
    { status: 500, headers: NO_STORE }
  );
}

/** Parses a JSON body, returning null when it is absent or malformed. */
export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Trims strings and drops empties from a possibly-messy array field. */
export function cleanList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

export function str(input: unknown, fallback = ""): string {
  return typeof input === "string" ? input.trim() : fallback;
}

export function bool(input: unknown, fallback = false): boolean {
  return typeof input === "boolean" ? input : fallback;
}

export function num(input: unknown, fallback = 0): number {
  return typeof input === "number" && Number.isFinite(input) ? input : fallback;
}
