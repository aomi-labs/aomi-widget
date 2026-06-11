import { CliSession } from "../cli-session";
import { createCliGetAccountAccessToken } from "../client-factory";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

type LoginWalletFamily = "evm" | "solana";

/**
 * Mint a backend-owned Privy auth URL for the active session and print it so
 * the user can complete browser login out of band.
 */
export async function loginCommand(
  config: CliConfig,
  options?: { walletFamily?: LoginWalletFamily },
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);

  const session = cli.createClientSession(config);
  try {
    const begin = await session.client.beginPrivyAuth(cli.sessionId, {
      application: cli.app,
      walletFamily: options?.walletFamily,
    });
    console.log("Open this URL to authenticate with Privy:");
    console.log(begin.auth_url);
    console.log("After the browser flow completes, run `aomi wallet whoami`.");
    printDataFileLocation();
  } finally {
    session.close();
  }
}

/**
 * Show the account the active session is bound to on the backend. Resolves the
 * binding via the account bearer (or persisted credential), so it doubles as a
 * "is my session authenticated / bound to a user" check.
 */
export async function whoamiCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);

  const state = cli.toState();
  const accountTokenProvider = createCliGetAccountAccessToken({
    baseUrl: state.baseUrl,
    apiKey: state.apiKey,
    accountAccessToken: state.accountAccessToken,
    accountProvider: state.accountProvider,
    accountProviderToken: state.accountProviderToken,
    app: state.app,
    execution: config.execution,
    secrets: {},
  });
  const hasCredential = Boolean(
    state.accountAccessToken ??
    (state.accountProvider && state.accountProviderToken),
  );

  const session = cli.createClientSession(config);
  try {
    const profile = await session.client.fetchAccountProfile(cli.sessionId);
    if (!profile) {
      const resolvedAccessToken = await accountTokenProvider?.({
        forceRefresh: true,
      });
      console.log("Not bound to an account (anonymous session).");
      if (!hasCredential) {
        console.log(
          "No account credential configured. Pass --account-bearer, or " +
            "--account-provider + --account-provider-token.",
        );
      } else if (
        state.accountProvider &&
        state.accountProviderToken &&
        !resolvedAccessToken
      ) {
        console.log(
          "Configured provider credential could not be exchanged for an Aomi account bearer.",
        );
      } else {
        console.log(
          "An account credential was sent, but the backend did not bind or accept this session.",
        );
      }
      printDataFileLocation();
      return;
    }

    const account = profile.account;
    console.log(`Account:  ${account.user_id}`);
    if (account.username) console.log(`Username: ${account.username}`);
    if (account.verified_email) {
      console.log(`Email:    ${account.verified_email}`);
    }
    if (account.tier) console.log(`Tier:     ${account.tier}`);
    if (account.status) console.log(`Status:   ${account.status}`);
    const wallets = profile.wallets ?? [];
    console.log(`Wallets:  ${wallets.length}`);
    for (const wallet of wallets) {
      const walletId = wallet.wallet_id ? ` (${wallet.wallet_id})` : "";
      console.log(
        `- ${formatWalletChainType(wallet.chain_type)} [${wallet.wallet_provider}]: ${wallet.address}${walletId}`,
      );
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}

function formatWalletChainType(chainType: string): string {
  const normalized = chainType.trim().toLowerCase();
  if (normalized === "ethereum" || normalized === "evm") {
    return "Ethereum";
  }
  if (normalized === "solana" || normalized === "svm") {
    return "Solana";
  }
  return chainType;
}
