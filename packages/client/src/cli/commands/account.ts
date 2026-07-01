import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import { signInWithCliSiwe, signOutCliSession } from "../auth";
import type { CliConfig } from "../types";

const DEFAULT_CHAIN_ID = 1;

export async function accountLoginCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
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
    console.log(JSON.stringify(account, null, 2));
    printDataFileLocation();
  } finally {
    session.close();
  }
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
