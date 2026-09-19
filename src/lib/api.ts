// Small helpers for API route handlers.
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok(data: unknown, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: err.flatten() },
      { status: 422 },
    );
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Parse a JSON array stored as a string, tolerant of bad data. */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
