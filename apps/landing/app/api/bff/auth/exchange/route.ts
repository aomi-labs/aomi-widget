import { createAuthExchangeRoute } from "@aomi-labs/account";

// Account graph reads/writes + bearer signing need Node (pg, EdDSA), not Edge.
export const runtime = "nodejs";

// Swap a verified Privy/Para credential for OUR session (`aomi_session` cookie).
// The browser never receives an AccountBearer; the same-origin proxy mints and
// injects one server-side from the session cookie.
export const POST = createAuthExchangeRoute({ providers: ["privy", "para"] });
