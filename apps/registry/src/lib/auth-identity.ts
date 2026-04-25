"use client";

/**
 * Stable import path — re-exports from the new auth-providers folder.
 */
export type { AomiAuthIdentity, AomiAuthStatus } from "./auth-providers/types";
export {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
} from "./auth-providers/types";
export {
  formatAddress,
  formatAuthProvider,
  inferAuthProvider,
} from "./auth-providers/auth-identity";
