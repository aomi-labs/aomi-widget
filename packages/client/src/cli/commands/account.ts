import { siweLogin } from "../account-auth";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

type LoginWalletFamily = "evm" | "solana";

/**
 * Authenticate the CLI against the BFF.
 *
 * Primary path — **non-interactive SIWE** with the CLI's EVM key: prove wallet
 * ownership, receive OUR `aomi_session`, and persist it. The CLI then mints
 * short-lived AccountBearers from `/api/bff/auth/token` on demand (see
 * `createSessionGetAccountBearer`). This is the headless analog of the browser
 * login and a drop-in to arixon's BetterAuth SIWE plugin — see
 * docs/handoffs/bff-betterauth-integration.md §3.
 *
 * Fallback — when no EVM key is configured (e.g. a Solana-only session), print a
 * backend-minted Privy auth URL to complete in a browser (legacy behavior).
 */
export async function loginCommand(
  config: CliConfig,
  options?: { walletFamily?: LoginWalletFamily },
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);

  const privateKey = config.privateKey ?? cli.privateKey;
  const wantsSolana = options?.walletFamily === "solana";

  // SIWE is the primary path whenever we hold an EVM key and aren't explicitly
  // asking for a Solana embedded-wallet flow.
  if (privateKey && !wantsSolana) {
    try {
      const { sessionToken, address } = await siweLogin({
        baseUrl: cli.baseUrl,
        privateKey,
        chainId: cli.chainId,
      });
      cli.setAccountSession(sessionToken);
      console.log(`Signed in as ${address}`);
      console.log(`Session established at ${cli.baseUrl}.`);
      console.log("Run `aomi wallet whoami` to confirm the bound account.");
      printDataFileLocation();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fatal(
        `SIWE login failed: ${message}\n` +
          "Ensure --base-url points at an Aomi BFF (it serves /api/bff/auth/siwe), not the raw backend.",
      );
    }
  }

  // Fallback: legacy backend-minted Privy URL (no local EVM key / Solana flow).
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
  const hasCredential = Boolean(state.accountBearer || state.accountSession);

  const session = cli.createClientSession(config);
  try {
    const profile = await session.client.fetchAccountProfile(cli.sessionId);
    if (!profile) {
      console.log("Not bound to an account (anonymous session).");
      if (!hasCredential) {
        console.log(
          "No account credential configured. Run `aomi login` (SIWE with your " +
            "wallet key) or pass --account-bearer.",
        );
      } else {
        console.log(
          "An account credential was sent, but the backend did not bind or accept this session.",
        );
      }
      printDataFileLocation();
      return;
    }

    const user = profile.user;
    console.log(`Account:  ${user.user_id}`);
    if (user.username) console.log(`Username: ${user.username}`);
    if (user.verified_email) {
      console.log(`Email:    ${user.verified_email}`);
    }
    if (user.tier) console.log(`Tier:     ${user.tier}`);
    if (user.status) console.log(`Status:   ${user.status}`);
    const wallets = profile.identity_wallets ?? [];
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
