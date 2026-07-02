import { createSiweNonceRoute } from "@aomi-labs/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Issue a single-use SIWE nonce for base's wallet-ownership login.
export const GET = createSiweNonceRoute();
export const POST = createSiweNonceRoute();
