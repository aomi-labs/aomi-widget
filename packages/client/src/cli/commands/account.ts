import { siweLogin } from "../account-auth";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";
import type { AomiListWalletsResponse } from "../../types";

type LoginWalletFamily = "evm" | "solana";

/**
 * The CLI's blue→yellow step: after auth, fetch the account's operable wallets
 * and persist the primary's address(es) as the operating wallet, so the
 * backend-signed (delegated) address reaches `UserState` without the CLI
 * holding a key. Best-effort and gap-filling — it never clobbers a local
 * self-custody key, and a `/wallets` hiccup is non-fatal.
 */
async function hydratePrimaryWallets(
  cli: CliSession,
  client: { listWallets(sessionId: string): Promise<AomiListWalletsResponse> },
  sessionId: string,
): Promise<void> {
  if (cli.publicKey && cli.svmPublicKey) {
    return;
  }
  let wallets: AomiListWalletsResponse["wallets"];
  try {
    ({ wallets } = await client.listWallets(sessionId));
  } catch {
    return;
  }
  const pick = (family: "evm" | "svm") =>
    wallets.find(
      (wallet) => wallet.chain_type === family && wallet.is_primary,
    ) ?? wallets.find((wallet) => wallet.chain_type === family);
  cli.hydrateOperatingWallet({
    evm: pick("evm")?.address,
    svm: pick("svm")?.address,
  });
}

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
export async function walletLoginCommand(
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
      const { sessionCookie, address } = await siweLogin({
        baseUrl: cli.baseUrl,
        privateKey,
        chainId: cli.chainId,
      });
      cli.setSessionCookie(sessionCookie);
      console.log(`Signed in as ${address}`);
      console.log(`Session established at ${cli.baseUrl}.`);
      // Hydrate the operating wallet from the account's wallets now that the
      // session is established (best-effort; `whoami` also backfills it).
      const session = cli.createClientSession(config);
      try {
        await hydratePrimaryWallets(cli, session.client, cli.sessionId);
      } finally {
        session.close();
      }
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
  const hasCredential = Boolean(state.accountBearer || state.sessionCookie);

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
    // Browser-based wallet login (`wallet login`) completes out of band, so
    // `whoami` is where the CLI first sees the connected wallet — hydrate the
    // operating address here too (no-op once a wallet is already set).
    await hydratePrimaryWallets(cli, session.client, cli.sessionId);
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
