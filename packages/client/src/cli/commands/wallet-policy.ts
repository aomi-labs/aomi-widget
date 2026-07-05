// =============================================================================
// wallet-policy — the account's keys (`public_keys`) as policy + capability
// =============================================================================
//
// `aomi wallet ls` renders the unified `GET /api/account/wallets` view — one
// row per key with its signing mode, delegated-grant status, and autonomous
// capability. `aomi wallet set-mode` flips one wallet's `signing_mode` through
// the signed EIP-712 permit flow (challenge → local viem signature → commit).

import { privateKeyToAccount } from "viem/accounts";
import { AomiAuthorizationError } from "../../client";
import type {
  AomiAccountWallet,
  AomiSigningMode,
  AomiWalletFamily,
} from "../../types";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { GREEN, RESET, YELLOW, printDataFileLocation } from "../output";
import type { CliConfig } from "../types";
import { normalizePrivateKey } from "../validation";

const RED = "\x1b[31m";

const MODE_COLOR: Record<AomiSigningMode, string> = {
  autonomous: GREEN,
  human_sync: YELLOW,
  denied: RED,
};

function isSigningMode(value: string): value is AomiSigningMode {
  return (
    value === "autonomous" || value === "human_sync" || value === "denied"
  );
}

function formatGrant(wallet: AomiAccountWallet): string {
  if (wallet.has_delegated_grant === undefined) return "-";
  if (!wallet.has_delegated_grant) return "✗";
  if (!wallet.expires_at) return "✓";
  return `✓ until ${new Date(wallet.expires_at * 1000).toISOString()}`;
}

function formatAutonomousOk(wallet: AomiAccountWallet): string {
  if (wallet.can_use_autonomous === undefined) return "-";
  return wallet.can_use_autonomous ? "yes" : "no";
}

const LS_HEADERS = [
  "address",
  "chain",
  "provider",
  "mode",
  "grant",
  "autonomous_ok",
  "primary",
];
const MODE_COLUMN = LS_HEADERS.indexOf("mode");

function printWalletTable(wallets: AomiAccountWallet[]): void {
  const rows = wallets.map((wallet) => ({
    cells: [
      wallet.address,
      wallet.chain_type,
      wallet.wallet_provider ?? "-",
      wallet.signing_mode ?? "-",
      formatGrant(wallet),
      formatAutonomousOk(wallet),
      wallet.is_primary ? "✓" : "",
    ],
    modeColor: wallet.signing_mode
      ? MODE_COLOR[wallet.signing_mode]
      : undefined,
  }));

  const widths = LS_HEADERS.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => row.cells[i].length)),
  );
  console.log(
    LS_HEADERS.map((header, i) => header.padEnd(widths[i]))
      .join("  ")
      .trimEnd(),
  );
  for (const row of rows) {
    const line = row.cells
      .map((cell, i) => {
        const padded = cell.padEnd(widths[i]);
        // Colorize after padding so ANSI codes do not skew column widths.
        return i === MODE_COLUMN && row.modeColor
          ? `${row.modeColor}${padded}${RESET}`
          : padded;
      })
      .join("  ");
    console.log(line.trimEnd());
  }
}

/**
 * List every key on the account — the unified `/api/account/wallets` view.
 * `--provider` filters client-side on `wallet_provider`.
 */
export async function walletLsCommand(
  config: CliConfig,
  options?: { provider?: string },
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);

  const session = cli.createClientSession(config);
  try {
    const { wallets } = await session.client.listWallets(cli.sessionId);
    const filtered = options?.provider
      ? wallets.filter((wallet) => wallet.wallet_provider === options.provider)
      : wallets;

    const suffix = options?.provider ? ` (provider: ${options.provider})` : "";
    console.log(`Wallets: ${filtered.length}${suffix}`);
    if (filtered.length > 0) {
      printWalletTable(filtered);
    }

    // Browser-based provider connects complete out of band, so `ls` is where
    // the CLI first sees a delegated wallet — persist the primary address(es)
    // as the operating wallet (no-op once one is set; never clobbers a local
    // self-custody key).
    const pick = (family: AomiWalletFamily) =>
      wallets.find(
        (wallet) => wallet.chain_type === family && wallet.is_primary,
      ) ?? wallets.find((wallet) => wallet.chain_type === family);
    cli.hydrateOperatingWallet({
      evm: pick("evm")?.address,
      svm: pick("svm")?.address,
    });

    printDataFileLocation();
  } finally {
    session.close();
  }
}

function fatalAuthorization(
  err: AomiAuthorizationError,
  signer: string,
): never {
  if (err.code === "missing_delegated_grant") {
    fatal(
      "No delegated grant for this wallet — run `aomi login --provider privy` first.",
    );
  }
  if (err.code === "stale_permit") {
    fatal(
      "Someone changed this wallet's authorization concurrently — re-run `aomi wallet set-mode`.",
    );
  }
  if (err.code === "mode_illegal_for_provider") {
    fatal(
      "That mode is illegal for this wallet's provider — autonomous requires a privy-provenanced wallet.",
    );
  }
  if (err.status === 403) {
    fatal(
      `The backend rejected the permit signature (signer ${signer}).\n` +
        "Grants (→ autonomous) must be signed by the wallet's own key — " +
        "pass that key via `--local-key`.",
    );
  }
  fatal(err.message);
}

/**
 * Flip one wallet's signing mode through the permit flow: challenge (backend
 * assembles the unsigned EIP-712 permit) → sign the returned `typed_data`
 * locally with viem → commit (backend verifies and applies). The signing key
 * comes from `--local-key`, else the stored dev key (`aomi wallet dev-key`).
 */
export async function setWalletModeCommand(
  config: CliConfig,
  opts: { address: string; mode: string; localKey?: string },
): Promise<void> {
  const address = opts.address.trim();
  const mode = opts.mode.trim();
  if (!address || !isSigningMode(mode)) {
    fatal(
      "Usage: aomi wallet set-mode <address> <autonomous|human_sync|denied> [--local-key <hex>]",
    );
  }

  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);

  const signingKey =
    normalizePrivateKey(opts.localKey) ?? config.privateKey ?? cli.privateKey;
  if (!signingKey) {
    fatal(
      "No key to sign the permit with.\n" +
        "Pass `--local-key <hex>`, or store a dev key with `aomi wallet dev-key <hex>`.",
    );
  }

  let account: ReturnType<typeof privateKeyToAccount>;
  try {
    account = privateKeyToAccount(signingKey as `0x${string}`);
  } catch {
    fatal("Invalid signing key — expected a 32-byte hex EVM private key.");
  }

  const chainType: AomiWalletFamily = /^0x[0-9a-fA-F]{40}$/.test(address)
    ? "evm"
    : "svm";

  const session = cli.createClientSession(config);
  try {
    const challenge = await session.client.challengeAuthorization(
      cli.sessionId,
      { chain_type: chainType, wallet: address, mode },
    );
    // Standard EIP-712 signing; the challenge's domain is name+version only.
    const signature = await account!.signTypedData(
      challenge.typed_data as Parameters<typeof account.signTypedData>[0],
    );
    const committed = await session.client.commitAuthorization(cli.sessionId, {
      permit: challenge.permit,
      signature,
    });
    console.log(
      `${committed.address} (${committed.chain_type}) signing_mode → ` +
        `${committed.signing_mode} (authorization v${committed.authorization_version})`,
    );
    printDataFileLocation();
  } catch (err) {
    if (err instanceof AomiAuthorizationError) {
      fatalAuthorization(err, account!.address);
    }
    throw err;
  } finally {
    session.close();
  }
}
