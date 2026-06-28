import { createAuthExchangeRoute } from "@aomi-labs/account";

// Account graph reads/writes + bearer signing need Node (pg, EdDSA), not Edge.
export const runtime = "nodejs";

// Swap a verified Privy/Para credential for OUR session (`aomi_session` cookie)
// + a freshly minted AccountBearer. The whole flow lives in `@aomi-labs/account`
// so portal, base, and landing share one exchange implementation.
export const POST = createAuthExchangeRoute({ providers: ["privy", "para"] });
