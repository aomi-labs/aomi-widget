"use client";

/**
 * Stable import path — re-exports from the new auth-providers folder.
 *
 * Existing code that imports `useAomiAuthAdapter` or `AomiAuthAdapter` from
 * this file will continue to work without changes.
 */
export { useAomiAuthAdapter } from "./auth-providers/context";
export type { AomiAuthAdapter } from "./auth-providers/types";
