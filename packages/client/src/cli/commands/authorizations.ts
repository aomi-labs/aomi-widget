import type { AomiAccountWallet } from "../../types";
import { CliSession } from "../cli-session";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

function formatExpiry(expiresAt: number | null | undefined): string {
  if (!expiresAt) return "no expiry";
  return new Date(expiresAt * 1000).toISOString();
}

function formatWallet(wallet: AomiAccountWallet): string {
  const label = wallet.label ? ` ${wallet.label}` : "";
  const ref =
    wallet.wallet_ref ?? `${wallet.wallet_provider ?? "?"}:${wallet.chain_type}`;
  return [
    ref,
    `${wallet.chain_type.toUpperCase()} ${wallet.address}`,
    `${wallet.wallet_provider ?? ""}${label}`.trim(),
    `expires ${formatExpiry(wallet.expires_at)}`,
  ].join(" | ");
}

/**
 * List the account's authorized (delegated) wallets — the wallets the backend
 * can sign with on the account's behalf. Sourced from the unified
 * `/api/account/wallets` (the `signing === "delegated"` subset). Read-only: the
 * backend resolves which one operates from the operating address (blue→pink),
 * so there is no client selection to make.
 */
export async function listAuthorizationsCommand(
  config: CliConfig,
  options?: { provider?: string },
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);

  const session = cli.createClientSession(config);
  try {
    const response = await session.client.listWallets(cli.sessionId);
    const delegated = response.wallets.filter(
      (wallet) =>
        wallet.signing === "delegated" &&
        (!options?.provider || wallet.wallet_provider === options.provider),
    );
    console.log(`Authorized wallets: ${delegated.length}`);
    for (const wallet of delegated) {
      console.log(`- ${formatWallet(wallet)}`);
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}
