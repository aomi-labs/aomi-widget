import "server-only";

/**
 * The portal session cookie now lives in `@aomi-labs/account` so every Aomi BFF
 * (portal, base, landing) shares one session shape and one signing convention.
 * This file is a thin re-export kept so existing `@portal/server/cookies/session`
 * imports stay valid — import from `@aomi-labs/account` directly in new code.
 */
export {
  SESSION_COOKIE,
  issueSessionCookie,
  readSessionCookie,
  setSessionCookie,
  getSessionedCanonicalId,
  clearSessionCookie,
} from "@aomi-labs/account";
