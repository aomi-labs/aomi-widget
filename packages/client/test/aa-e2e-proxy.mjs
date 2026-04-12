/**
 * E2E: verify the backend AA proxy works with Alchemy Wallet APIs.
 *
 * Tests the full chain:
 *   CLI → backend proxy (/aa/v1/:chain_slug) → api.g.alchemy.com Wallet APIs
 *
 * Phase 1: Method validation (no gas policy needed)
 *   - wallet_getCapabilities
 *   - wallet_prepareCalls (validates request shape, will fail on AA23 if policy is broken)
 *   - wallet_getCallsStatus (validates error shape for unknown ID)
 *
 * Phase 2: Full transaction (requires working gas policy)
 *   - wallet_prepareCalls → sign → wallet_sendPreparedCalls → wallet_getCallsStatus
 *
 * Usage:
 *   PRIVATE_KEY=0x... \
 *   PROXY_URL=http://127.0.0.1:8080/aa/v1/eth-mainnet \
 *   node test/aa-e2e-proxy.mjs
 *
 * Optional:
 *   ALCHEMY_GAS_POLICY_ID=...   enable sponsorship (Phase 2)
 *   ALCHEMY_API_KEY=...         for balance checks via standard RPC
 *   MODE=7702|4337|both         (default: 7702)
 *   SKIP_TX=1                   only run Phase 1 (method validation)
 */
import { createPublicClient, http } from "viem";
import { mainnet, sepolia, base, polygon, arbitrum, optimism } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  createSmartWalletClient,
  alchemyWalletTransport,
} from "@alchemy/wallet-apis";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PROXY_URL = process.env.PROXY_URL ?? "http://127.0.0.1:8080/aa/v1/eth-mainnet";
const GAS_POLICY_ID = process.env.ALCHEMY_GAS_POLICY_ID;
const API_KEY = process.env.ALCHEMY_API_KEY;
const MODE = (process.env.MODE ?? "7702").toLowerCase();
const SKIP_TX = process.env.SKIP_TX === "1";

if (!PRIVATE_KEY) {
  console.error("Required: PRIVATE_KEY");
  process.exit(1);
}

const slugMatch = PROXY_URL.match(/\/aa\/v1\/([a-z0-9-]+)$/);
const slug = slugMatch?.[1] ?? "eth-mainnet";
const SLUG_TO_CHAIN = {
  "eth-mainnet": mainnet,
  "eth-sepolia": sepolia,
  "base-mainnet": base,
  "polygon-mainnet": polygon,
  "arb-mainnet": arbitrum,
  "opt-mainnet": optimism,
};
const chain = SLUG_TO_CHAIN[slug] ?? mainnet;
const signer = privateKeyToAccount(PRIVATE_KEY);

console.log("=== AA Proxy E2E Test ===");
console.log(`proxy:   ${PROXY_URL}`);
console.log(`chain:   ${chain.name} (${chain.id})`);
console.log(`signer:  ${signer.address}`);
console.log(`mode:    ${MODE}`);
console.log(`policy:  ${GAS_POLICY_ID ?? "(none)"}`);
console.log("");

// ---------------------------------------------------------------------------
// Phase 1: Method validation (raw JSON-RPC through proxy)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

async function jsonRpc(method, params) {
  const resp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return resp.json();
}

function check(name, ok, detail) {
  if (ok) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}: ${detail}`);
    failed++;
  }
}

console.log("Phase 1: Proxy method validation");

// 1a. wallet_getCapabilities
{
  const resp = await jsonRpc("wallet_getCapabilities", [signer.address]);
  const hasResult = resp.result && typeof resp.result === "object";
  check(
    "wallet_getCapabilities",
    hasResult,
    hasResult ? "" : JSON.stringify(resp.error ?? resp),
  );
  if (hasResult) {
    const chains = Object.keys(resp.result);
    console.log(`       chains: ${chains.join(", ")}`);
    const cap = resp.result[chains[0]];
    console.log(`       capabilities: ${Object.keys(cap).join(", ")}`);
  }
}

// 1b. wallet_getCallsStatus with invalid ID — should get proper error, not "unsupported method"
{
  const resp = await jsonRpc("wallet_getCallsStatus", ["0x0000000000000000000000000000000000000000000000000000000000000001"]);
  const isProperError = resp.error && resp.error.code === -32602;
  const isNotUnsupported = !resp.error?.message?.includes("Unsupported method");
  check(
    "wallet_getCallsStatus (invalid ID → proper error)",
    isProperError && isNotUnsupported,
    isProperError ? "" : JSON.stringify(resp.error ?? resp),
  );
}

// 1c. wallet_prepareCalls — validates the proxy can reach Alchemy Wallet APIs
// AA23 is fine (gas policy issue), "Unsupported method" means wrong endpoint
{
  const resp = await jsonRpc("wallet_prepareCalls", [{
    from: signer.address,
    chainId: `0x${chain.id.toString(16)}`,
    calls: [{ to: signer.address, data: "0x", value: "0x0" }],
    ...(GAS_POLICY_ID ? { capabilities: { paymasterService: { policyId: GAS_POLICY_ID } } } : {}),
  }]);
  const isSuccess = !!resp.result;
  const isValidError = resp.error && !resp.error.message?.includes("Unsupported method");
  check(
    "wallet_prepareCalls (reaches Wallet APIs)",
    isSuccess || isValidError,
    isSuccess ? "prepared!" : (isValidError ? `expected error: ${resp.error.message}` : JSON.stringify(resp.error)),
  );
  if (resp.result) {
    console.log(`       ✨ prepareCalls succeeded — gas policy works!`);
  } else if (resp.error?.message?.includes("AA23")) {
    console.log(`       ⚠️  AA23: gas policy is rejecting — fix in Alchemy dashboard`);
  }
}

// 1d. Verify proxy rejects unknown chain slugs
{
  const badUrl = PROXY_URL.replace(/\/[a-z0-9-]+$/, "/fake-chain");
  try {
    const resp = await fetch(badUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "wallet_getCapabilities", params: [] }),
    });
    check(
      "proxy rejects unknown chain slug",
      resp.status === 400,
      `expected 400, got ${resp.status}`,
    );
  } catch (err) {
    check("proxy rejects unknown chain slug", false, err.message);
  }
}

console.log(`\nPhase 1 results: ${passed} passed, ${failed} failed\n`);

// ---------------------------------------------------------------------------
// Phase 2: Full SDK transaction (requires working gas policy)
// ---------------------------------------------------------------------------

if (SKIP_TX) {
  console.log("Phase 2: Skipped (SKIP_TX=1)");
  process.exit(failed > 0 ? 1 : 0);
}

console.log("Phase 2: Full SDK transaction via proxy");

function makeClient() {
  return createSmartWalletClient({
    transport: alchemyWalletTransport({ url: PROXY_URL }),
    chain,
    signer,
    ...(GAS_POLICY_ID ? { paymaster: { policyId: GAS_POLICY_ID } } : {}),
  });
}

const modes = MODE === "both" ? ["7702", "4337"] : [MODE];
const results = [];

for (const mode of modes) {
  try {
    const walletClient = makeClient();
    let account;
    if (mode === "4337") {
      account = await walletClient.requestAccount();
    }

    const senderAddress = account?.address ?? signer.address;
    console.log(`\n  mode: ${mode}, sender: ${senderAddress}`);
    console.log("  sending 1-call batch (self-call, 0 value)...");

    const result = await walletClient.sendCalls({
      ...(account ? { account: account.address } : {}),
      calls: [{ to: senderAddress, data: "0x", value: 0n }],
    });

    console.log(`  call id: ${result.id}`);
    const status = await walletClient.waitForCallsStatus({ id: result.id });
    const tx = status.receipts?.[0]?.transactionHash;

    if (tx) {
      console.log(`  ✅ ${mode}: tx ${tx}`);
      results.push({ mode, tx, callId: result.id });
      passed++;
    } else {
      console.log(`  ❌ ${mode}: no tx hash. Status: ${JSON.stringify(status)}`);
      failed++;
    }
  } catch (err) {
    const msg = err.message?.slice(0, 200) ?? String(err);
    console.log(`  ❌ ${mode}: ${msg}`);
    if (msg.includes("AA23")) {
      console.log("     ⚠️  Gas policy is rejecting — fix in Alchemy Gas Manager dashboard");
    }
    failed++;
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (results.length > 0) {
  for (const r of results) console.log(`  ${r.mode}: ${r.tx}`);
}
process.exit(failed > 0 ? 1 : 0);
