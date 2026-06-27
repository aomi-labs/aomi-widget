import type { AomiAuthorizedWallet } from "../../types";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
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

async function fetchWallets(
  config: CliConfig,
  cli: CliSession,
  options?: { provider?: string },
): Promise<AomiAuthorizedWallet[]> {
  const session = cli.createClientSession(config);
  try {
    const response = await session.client.listAuthorizedWallets(cli.sessionId, {
      provider: options?.provider,
    });
    return response.wallets;
  } finally {
    session.close();
  }
}

export async function listAuthorizationsCommand(
  config: CliConfig,
  options?: { provider?: string },
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);
  const wallets = await fetchWallets(config, cli, options);

  console.log(`Authorized wallets: ${wallets.length}`);
  for (const wallet of wallets) {
    console.log(`- ${formatWallet(wallet)}`);
  }
  printDataFileLocation();
}

export async function currentAuthorizationCommand(
  config: CliConfig,
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);
  const walletRef = cli.operatingWalletRef();
  if (!walletRef) {
    console.log("No authorized wallet selected.");
    printDataFileLocation();
    return;
  }
  console.log(`Authorized wallet: ${walletRef}`);
  printDataFileLocation();
}

export async function useAuthorizationCommand(
  config: CliConfig,
  walletRef: string,
  options?: { provider?: string },
): Promise<void> {
  const ref = walletRef.trim();
  if (!ref) fatal("Usage: aomi account auth use <wallet-ref>");

  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);
  const wallets = await fetchWallets(config, cli, options);
  const wallet = wallets.find((candidate) => candidate.wallet_ref === ref);
  if (!wallet) {
    fatal(
      `Authorized wallet "${ref}" was not found for this account. Run ` +
        "`aomi account auth list` to see available refs.",
    );
  }

  cli.setOperatingWalletRef(ref);
  console.log("Selected authorized wallet:");
  console.log(formatWallet(wallet));
  printDataFileLocation();
}

export async function clearAuthorizationCommand(
  config: CliConfig,
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);
  cli.clearOperatingWalletRef();
  console.log("Cleared authorized wallet selection.");
  printDataFileLocation();
}
