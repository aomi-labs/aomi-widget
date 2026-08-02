/**
 * Orchestration around product-mono's `aomi test-env` anvil-fork harness.
 *
 * We do not spawn anvil ourselves — `aomi test-env` already owns the fork
 * lifecycle, pre-funding, and detached process management. This module only
 * reads its state and turns it into the env vars the portal needs.
 *
 * SAFETY: read `assertForkedOrDie` before changing anything here.
 */

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TEST_ENV_DIR = join(homedir(), ".aomi", "test-env");
const PIDS_PATH = join(TEST_ENV_DIR, "pids.json");

/**
 * Which `aomi` to shell out to.
 *
 * The released CLI on PATH (homebrew, v0.3.9) does NOT carry the `test-env`
 * command group — it answers "Unknown command test-env". Only a build from
 * product-mono source has it, so default to that and let AOMI_BIN override.
 */
const AOMI_BIN =
  process.env.AOMI_BIN ??
  join(homedir(), "Code", "product-mono", "aomi", "target", "debug", "aomi-cli");

export type ForkedChain = {
  chainId: number;
  port: number;
  rpcUrl: string;
};

/**
 * `pids.json` is written by product-mono's `test_env/evm/state.rs`. We read it
 * rather than parsing `aomi test-env evm status` output because a file schema is
 * a more stable contract than human-facing CLI text.
 *
 * Verified against a live `test-env evm up --chains 1` on 2026-07-31:
 *
 *   { "version": 1, "started_at": 1785472012,
 *     "proxies": [ { "chain_id": 1, "pid": 76737, "port": 51610,
 *                    "endpoint": "http://127.0.0.1:51610",
 *                    "fork_url": "...", "name": "ethereum" } ] }
 *
 * `endpoint` is authoritative — prefer it over rebuilding the URL from `port`,
 * so a future bind-address change does not silently point us at the wrong host.
 */
function parsePids(raw: string): ForkedChain[] {
  const parsed = JSON.parse(raw) as { proxies?: unknown };
  const proxies = Array.isArray(parsed.proxies) ? parsed.proxies : [];

  const chains: ForkedChain[] = [];
  for (const proxy of proxies) {
    const record = (proxy ?? {}) as Record<string, unknown>;
    const chainId = Number(record.chain_id);
    const port = Number(record.port);
    if (!Number.isInteger(chainId) || chainId <= 0) continue;
    if (!Number.isInteger(port) || port <= 0) continue;
    const endpoint =
      typeof record.endpoint === "string" && record.endpoint.length > 0
        ? record.endpoint
        : `http://127.0.0.1:${port}`;
    chains.push({ chainId, port, rpcUrl: endpoint });
  }

  if (chains.length === 0) {
    throw new Error(
      `Could not read any chain/port pairs from ${PIDS_PATH}.\n` +
        `Expected a "proxies" array of {chain_id, port, endpoint}.\n` +
        `Raw contents:\n${raw}\n\n` +
        `If product-mono changed this file's schema, update parsePids().`,
    );
  }
  return chains;
}

export async function readForkedChains(): Promise<ForkedChain[]> {
  let raw: string;
  try {
    raw = await readFile(PIDS_PATH, "utf8");
  } catch {
    throw new Error(
      `No fork state at ${PIDS_PATH}. Start the harness first:\n\n` +
        `  FULL_TESTNETS=true ALCHEMY_API_KEY=... ${AOMI_BIN} test-env evm up --chains 1\n\n` +
        `(The homebrew \`aomi\` on PATH has no test-env command — build it from ` +
        `product-mono, or set AOMI_BIN.)\n`,
    );
  }
  return parsePids(raw);
}

/** Build the value for NEXT_PUBLIC_FULL_TESTNET_RPC_MAP (JSON form). */
export function toRpcMap(chains: readonly ForkedChain[]): string {
  return JSON.stringify(
    Object.fromEntries(chains.map((c) => [String(c.chainId), c.rpcUrl])),
  );
}

/**
 * Refork one chain so every take starts from identical state. This is what
 * makes takes repeatable — without it, take 2 inherits take 1's transactions.
 */
export async function resetChain(chainId: number): Promise<void> {
  // Note the `evm` layer: the real command is `aomi test-env evm reset`, not
  // `aomi test-env reset` as product-mono's full-testnet.md shows. Verified
  // against aomi/bin/cli/src/cli.rs (TestEnvEvmCommand).
  await execFileAsync(
    AOMI_BIN,
    ["test-env", "evm", "reset", "--chain", String(chainId)],
    { env: { ...process.env, FULL_TESTNETS: "true" } },
  );
}

/**
 * Hard preflight. Do not remove, and do not downgrade to a warning.
 *
 * The portal's full-testnet routing fails OPEN: if NEXT_PUBLIC_USE_FULL_TESTNET
 * is unset or the RPC map does not parse, `isFullTestnet()` returns false and
 * the app quietly falls back to real mainnet RPCs. Our scenario prompts tell the
 * agent to stake, swap and bridge. Running them against a funded wallet on real
 * mainnet would spend real money while looking exactly like a successful take.
 *
 * So: prove the fork is live and answering before any scenario is allowed to run.
 */
export async function assertForkedOrDie(
  chains: readonly ForkedChain[],
): Promise<void> {
  if (chains.length === 0) {
    throw new Error("Refusing to record: no forked chains detected.");
  }

  for (const chain of chains) {
    const response = await fetch(chain.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "anvil_nodeInfo",
        params: [],
      }),
    }).catch(() => null);

    if (!response?.ok) {
      throw new Error(
        `Refusing to record: chain ${chain.chainId} at ${chain.rpcUrl} did not respond.`,
      );
    }

    // `anvil_nodeInfo` only exists on anvil. A real RPC returns a JSON-RPC
    // error for it, which is precisely the signal we want to catch.
    const body = (await response.json()) as { result?: unknown; error?: unknown };
    if (body.error || !body.result) {
      throw new Error(
        `Refusing to record: ${chain.rpcUrl} answered but is NOT an anvil fork ` +
          `(anvil_nodeInfo rejected). This is the failure mode that spends real money.`,
      );
    }
  }
}

/**
 * Current block height on a fork.
 *
 * This is how we prove a take actually executed on-chain. We cannot watch
 * backend→fork traffic from the browser (the agent's tools run server-side), so
 * "did the chain move?" is the only honest client-side signal that a scenario
 * did more than talk.
 */
export async function blockNumber(chain: ForkedChain): Promise<number> {
  const response = await fetch(chain.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_blockNumber",
      params: [],
    }),
  });
  const body = (await response.json()) as { result?: string };
  return Number.parseInt(body.result ?? "0x0", 16);
}

/** Env overrides the portal dev server needs to route at the fork. */
export function portalEnv(chains: readonly ForkedChain[]): NodeJS.ProcessEnv {
  return {
    NEXT_PUBLIC_USE_FULL_TESTNET: "true",
    NEXT_PUBLIC_FULL_TESTNET_RPC_MAP: toRpcMap(chains),
  };
}
