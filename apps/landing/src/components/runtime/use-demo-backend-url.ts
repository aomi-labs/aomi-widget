"use client";

/**
 * Landing demos proxy the backend through the same Next.js origin, so the
 * runtime base can stay stable across server render and hydration.
 */
export function useDemoBackendUrl(): string | null {
  return "/";
}
