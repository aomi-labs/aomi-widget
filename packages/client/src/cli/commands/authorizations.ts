import type { AomiAuthorizedWallet } from "../../types";
import { CliSession } from "../cli-session";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

function formatExpiry(expiresAt: number | null | undefined): string {
  if (!expiresAt) return "no expiry";
  return new Date(expiresAt * 1000).toISOString();
}

function formatWallet(wallet: AomiAuthorizedWallet): string {
  const label = wallet.label ? ` ${wallet.label}` : "";
  return [
    wallet.wallet_ref,
    `${wallet.family.toUpperCase()} ${wallet.address}`,
    `${wallet.wallet_provider}${label}`,
    `expires ${formatExpiry(wallet.expires_at)}`,
  ].join(" | ");
}

/**
 * List the account's authorized (delegated) wallets — the wallets the backend
 * can sign with on the account's behalf. Read-only: the backend resolves which
 * one operates from the account's grants (blue→pink), so there is no client
 * selection to make.
 */
export async function listAuthorizationsCommand(
  config: CliConfig,
  options?: { provider?: string },
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);

  const session = cli.createClientSession(config);
  try {
    const response = await session.client.listAuthorizedWallets(cli.sessionId, {
      provider: options?.provider,
    });
    console.log(`Authorized wallets: ${response.wallets.length}`);
    for (const wallet of response.wallets) {
      console.log(`- ${formatWallet(wallet)}`);
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}
