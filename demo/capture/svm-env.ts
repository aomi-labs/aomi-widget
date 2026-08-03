/**
 * Orchestration around product-mono's `aomi test-env svm` Surfpool mirror —
 * the Solana sibling of test-env.ts. Same philosophy: we never spawn the
 * mirror ourselves, we only reset it, seed scenario state, and verify.
 *
 * Two SVM-specific truths shape this module (phase-0, 2026-08-01):
 *
 * - Surfpool mints slots on a clock, so "did the slot advance?" proves
 *   NOTHING about execution. The EVM block-delta guard has no analog here;
 *   execution is proven by balance assertions instead (`checkAssertions`).
 * - `getVersion` returns a `surfnet-version` field that no real Solana RPC
 *   has — that is the fork-authenticity probe (the `anvil_nodeInfo` analog),
 *   read-only and standard.
 */

import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const AOMI_BIN =
  process.env.AOMI_BIN ??
  join(homedir(), "Code", "product-mono", "aomi", "target", "debug", "aomi-cli");

/** The mirror's RPC. `test-env svm up` binds 127.0.0.1:8899 by default. */
export const SVM_MIRROR_URL =
  process.env.SVM_MIRROR_URL ?? "http://127.0.0.1:8899";

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(SVM_MIRROR_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await response.json()) as { result?: unknown; error?: unknown };
  if (body.error) {
    throw new Error(`${method} failed: ${JSON.stringify(body.error)}`);
  }
  return body.result;
}

/**
 * Hard preflight, same contract as the EVM `assertForkedOrDie`: prove the RPC
 * is a Surfpool mirror before any scenario may run. The portal's SVM executor
 * is loopback-only, so the money-spending failure mode is narrower than on
 * EVM — but a real validator on localhost (or a dead mirror replaced by
 * something else on the port) must still refuse to record.
 */
export async function assertSurfnetOrDie(): Promise<void> {
  let version: Record<string, unknown>;
  try {
    version = (await rpc("getVersion", [])) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Refusing to record: no Solana RPC answering at ${SVM_MIRROR_URL}. ` +
        `Start the mirror first:\n\n` +
        `  FULL_TESTNETS=true ${AOMI_BIN} test-env svm up --cluster mainnet-beta\n\n` +
        `(cause: ${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (!("surfnet-version" in version)) {
    throw new Error(
      `Refusing to record: ${SVM_MIRROR_URL} is a Solana RPC but NOT a ` +
        `Surfpool mirror (getVersion has no "surfnet-version"). Recording ` +
        `against a real validator is the failure mode that spends real money.`,
    );
  }
}

/**
 * Ask the mirror to reset.
 *
 * MEASURED 2026-08-01, and the reason `fund` exists: this does NOT restart
 * Surfpool and does NOT re-apply the startup airdrop or the providers.toml
 * `token_fixtures`. After the first ds6 take the process had been up 3h57m
 * and the demo wallet was left at 0.02 SOL — the take had silently started
 * from the *previous* take's leftovers rather than a clean 10 SOL, and only
 * passed because the assertions were loose enough to straddle both worlds.
 *
 * So the studio treats reset as best-effort and owns the starting state
 * outright: `setSolBalance` + `setTokenAccount` write every balance a
 * scenario depends on, after the reset. Same conclusion the EVM side reached
 * ("fund AFTER reset") for a different reason.
 */
export async function resetSvm(cluster: string): Promise<void> {
  await execFileAsync(
    AOMI_BIN,
    ["test-env", "svm", "reset", "--cluster", cluster],
    { env: { ...process.env, FULL_TESTNETS: "true" } },
  );
  await assertSurfnetOrDie();
}

/**
 * Set the wallet's native SOL balance outright — the `anvil_setBalance`
 * analog, and the reason a take can be re-run without re-forking. `value` is
 * raw lamports.
 */
export async function setSolBalance(
  owner: string,
  lamports: string,
): Promise<void> {
  await rpc("surfnet_setAccount", [owner, { lamports: Number(lamports) }]);
}

/**
 * Fabricate an associated token account via the surfnet-native cheat-RPC —
 * the same mechanism `test-env svm` fixtures use. `amount: "0"` creates an
 * EMPTY ATA, which matters more than it looks: the `svm_stage_ix` skill
 * manifests currently block ATA creation, so a first-time Marinade stake
 * fails `AccountNotInitialized` unless the destination account already
 * exists. Until the manifest fix lands, the studio pre-creates it.
 */
export async function setTokenAccount(
  owner: string,
  mint: string,
  amount: string,
): Promise<void> {
  await rpc("surfnet_setTokenAccount", [
    owner,
    mint,
    { amount: Number(amount) },
  ]);
}

/** Lamports, as bigint. */
export async function solBalance(owner: string): Promise<bigint> {
  const result = (await rpc("getBalance", [owner])) as { value: number };
  return BigInt(result.value);
}

/** Raw base units of `mint` held by `owner` across its token accounts. */
export async function splBalance(
  owner: string,
  mint: string,
): Promise<bigint> {
  const result = (await rpc("getTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed" },
  ])) as {
    value: Array<{
      account: {
        data: { parsed: { info: { tokenAmount: { amount: string } } } };
      };
    }>;
  };
  let total = BigInt(0);
  for (const entry of result.value) {
    total += BigInt(entry.account.data.parsed.info.tokenAmount.amount);
  }
  return total;
}

export type SvmAssertion =
  | { kind: "sol"; atLeast?: string; atMost?: string }
  | { kind: "spl"; symbol: string; mint: string; atLeast?: string; atMost?: string };

/**
 * Prove execution from chain state. Every failed assertion is reported —
 * a take that "looked great" but moved no balances is not a demo.
 */
export async function checkAssertions(
  owner: string,
  assertions: readonly SvmAssertion[],
): Promise<{ ok: boolean; report: string[] }> {
  const report: string[] = [];
  let ok = true;
  for (const assertion of assertions) {
    const balance =
      assertion.kind === "sol"
        ? await solBalance(owner)
        : await splBalance(owner, assertion.mint);
    const label = assertion.kind === "sol" ? "SOL(lamports)" : assertion.symbol;
    const atLeast = assertion.atLeast ? BigInt(assertion.atLeast) : null;
    const atMost = assertion.atMost ? BigInt(assertion.atMost) : null;
    const pass =
      (atLeast === null || balance >= atLeast) &&
      (atMost === null || balance <= atMost);
    if (!pass) ok = false;
    report.push(
      `${pass ? "ok  " : "FAIL"} ${label}=${balance}` +
        (atLeast !== null ? ` atLeast=${atLeast}` : "") +
        (atMost !== null ? ` atMost=${atMost}` : ""),
    );
  }
  return { ok, report };
}
