import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import { signInWithCliSiwe, signOutCliSession } from "../auth";
import type { CliConfig } from "../types";
import {
  signInWithDeviceProvider,
  type DeviceAuthProvider,
} from "../device-auth";
import { DEFAULT_CLI_BASE_URL } from "../client-factory";

const DEFAULT_CHAIN_ID = 1;
const LEGACY_RAW_BACKEND_URL = "https://api.aomi.dev";

export type AccountLoginOptions = {
  provider?: string;
  wallet?: boolean;
  noBrowser?: boolean;
};

export async function accountLoginCommand(
  config: CliConfig,
  options: AccountLoginOptions = {},
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  if (!config.baseUrl && cli.baseUrl === LEGACY_RAW_BACKEND_URL) {
    cli.setBaseUrl(DEFAULT_CLI_BASE_URL);
  }
  if (options.wallet || options.noBrowser || config.privateKey) {
    await accountLoginWithSiwe(cli, config);
    return;
  }

  if (
    options.provider &&
    options.provider !== "privy" &&
    options.provider !== "para"
  ) {
    fatal('Unknown --provider value. Use "privy" or "para".');
  }

  const provider = options.provider as DeviceAuthProvider | undefined;
  const result = await signInWithDeviceProvider({
    baseUrl: cli.baseUrl,
    provider,
  });
  cli.setAuthSession(result.auth);

  console.log(
    `Signed in${result.provider ? ` with ${formatProvider(result.provider)}` : ""}`,
  );
  console.log(
    `Session expires at ${new Date(result.auth.expiresAt).toISOString()}`,
  );
  printDataFileLocation();
}

async function accountLoginWithSiwe(
  cli: CliSession,
  config: CliConfig,
): Promise<void> {
  const privateKey = config.privateKey ?? cli.privateKey;
  if (!privateKey) {
    fatal(
      "No EVM private key configured.\n" +
        "Run `aomi wallet set <evm-private-key>` or pass `--private-key`.",
    );
  }

  const chainId = config.chain ?? cli.chainId ?? DEFAULT_CHAIN_ID;
  const result = await signInWithCliSiwe({
    baseUrl: cli.baseUrl,
    privateKey: privateKey as `0x${string}`,
    chainId,
  });

  cli.setWallet(privateKey!, result.address);
  if (cli.chainId !== chainId) {
    cli.setChainId(chainId);
  }
  cli.setAuthSession(result.auth);

  console.log(`Signed in with ${result.address}`);
  console.log(
    `Session expires at ${new Date(result.auth.expiresAt).toISOString()}`,
  );
  printDataFileLocation();
}

function formatProvider(provider: DeviceAuthProvider): string {
  return provider === "privy" ? "Privy" : "Para";
}

export async function accountWhoamiCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);

  const session = cli.createClientSession();
  try {
    const account = await session.client.getAccount(cli.sessionId);
    const user = account.user;
    console.log(`Account:  ${user.user_id}`);
    if (user.username) console.log(`Username: ${user.username}`);
    if (user.verified_email) {
      console.log(`Email:    ${user.verified_email}`);
    }
    if (user.tier) console.log(`Tier:     ${user.tier}`);
    if (user.status) console.log(`Status:   ${user.status}`);
    const wallets = account.identity_wallets ?? [];
    console.log(`Wallets:  ${wallets.length}`);
    for (const wallet of wallets) {
      const walletId = wallet.wallet_id ? ` (${wallet.wallet_id})` : "";
      console.log(
        `- ${formatWalletChainType(wallet.chain_type)} [${wallet.wallet_provider}]: ${wallet.address}${walletId}`,
      );
    }
    printDataFileLocation();
  } catch {
    console.log("Not bound to an account (anonymous session).");
    if (!hasAccountCredential(cli.toState())) {
      console.log(
        "No account credential configured. Run `aomi account login` or pass --account-bearer.",
      );
    } else {
      console.log(
        "An account credential was sent, but the backend did not bind or accept this session.",
      );
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export const whoamiCommand = accountWhoamiCommand;

function hasAccountCredential(
  state: ReturnType<CliSession["toState"]>,
): boolean {
  return Boolean(state.auth?.sessionToken || state.accountBearer);
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

export async function logoutCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);

  const token = cli.auth?.sessionToken;
  try {
    await signOutCliSession({
      baseUrl: cli.baseUrl,
      sessionToken: token,
    });
  } finally {
    cli.clearAuthSession();
  }

  console.log("Signed out");
  printDataFileLocation();
}
