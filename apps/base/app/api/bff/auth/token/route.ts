import { createBearerTokenRoute } from "@aomi-labs/account";

// Minting the AccountBearer needs Node (EdDSA signing key), not Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mint a short-lived AccountBearer from the BFF session. Headless clients (the
// `aomi` CLI) hold the long-lived session and pull a backend bearer here; the
// browser uses the same-origin proxy instead and never calls this.
export const GET = createBearerTokenRoute();
