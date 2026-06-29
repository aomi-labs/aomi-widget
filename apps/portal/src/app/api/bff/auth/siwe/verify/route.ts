import { createSiweExchangeRoute } from "@aomi-labs/account";

// SIWE verify + bearer signing need Node (pg, EdDSA, viem RPC), not Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verify a SIWE signature (EOA → smart-account EIP-1271/6492) and establish the
// `aomi_session`, resolving the wallet-keyed canonical user. Mounted for parity
// so a headless client (the `aomi` CLI) can log in here as well as on base.
export const POST = createSiweExchangeRoute();
