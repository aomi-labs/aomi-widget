import { createSiweNonceRoute } from "@aomi-labs/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Issue a single-use SIWE nonce. Wallet-ownership login (used by the `aomi` CLI,
// which signs with its device key) alongside landing's provider auth.
export const GET = createSiweNonceRoute();
export const POST = createSiweNonceRoute();
