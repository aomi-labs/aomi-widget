"use client";

/**
 * The session bridge now lives in `@aomi-labs/widget-lib` so portal, base, and
 * landing share one implementation. This thin re-export keeps existing
 * `@portal/components/providers/aomi-session-bridge` imports valid — import from
 * `@aomi-labs/widget-lib` directly in new code.
 */
export {
  AomiSessionProvider,
  useAomiSession,
  type AomiSessionStatus,
} from "@aomi-labs/widget-lib";
