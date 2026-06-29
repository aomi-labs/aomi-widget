import { createSiweExchangeRoute } from "@aomi-labs/account";

// SIWE verify + bearer signing need Node (pg, EdDSA, viem RPC), not Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verify a base smart-account SIWE signature (EIP-1271/6492) and establish the
// `aomi_session`. base authenticates by wallet-ownership proof, not a provider
// JWT — see `createSiweExchangeRoute` in `@aomi-labs/account`.
export const POST = createSiweExchangeRoute();
