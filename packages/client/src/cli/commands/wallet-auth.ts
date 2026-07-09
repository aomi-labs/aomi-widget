import { privateKeyToAccount } from "viem/accounts";
import {
  toViemSignTypedDataArgs,
  type WalletEip712Payload,
} from "../../wallet-utils";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

export type WalletListOptions = {
  provider?: string;
};

export type WalletSetModeOptions = {
  chainType?: string;
};

type SigningMode = "autonomous" | "human_sync" | "denied";

function requireActiveCli(config: CliConfig): CliSession {
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active thread. Run `aomi thread new` first.");
  }
  cli!.mergeConfig(config);
  return cli!;
}

function normalizeSigningMode(mode: string): SigningMode {
  const normalized = mode.trim().toLowerCase();
  if (
    normalized === "autonomous" ||
    normalized === "human_sync" ||
    normalized === "denied"
  ) {
    return normalized;
  }
  fatal('Mode must be one of "autonomous", "human_sync", or "denied".');
}

function formatProviderFilter(
  provider: string | undefined,
): string | undefined {
  const normalized = provider?.trim().toLowerCase();
  return normalized || undefined;
}

export async function walletListCommand(
  config: CliConfig,
  options: WalletListOptions = {},
): Promise<void> {
  const cli = requireActiveCli(config);
  const provider = formatProviderFilter(options.provider);
  const session = cli.createClientSession(config);
  try {
    const result = await session.client.listAccountWallets(cli.sessionId);
    const wallets = provider
      ? result.wallets.filter(
          (wallet) => wallet.wallet_provider.toLowerCase() === provider,
        )
      : result.wallets;
    if (wallets.length === 0) {
      console.log("No wallets.");
      printDataFileLocation();
      return;
    }
    for (const wallet of wallets) {
      const label = wallet.label ? ` "${wallet.label}"` : "";
      const delegated = wallet.has_delegated_grant ? "delegated" : "client";
      const autonomous = wallet.can_use_autonomous
        ? "autonomous-ready"
        : "human-sync-only";
      console.log(
        `${wallet.chain_type} [${wallet.wallet_provider}] ${wallet.address}${label}`,
      );
      console.log(
        `  signing=${wallet.signing} mode=${wallet.signing_mode} grant=${delegated} ${autonomous}`,
      );
      if (wallet.wallet_ref) console.log(`  ref=${wallet.wallet_ref}`);
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export async function walletSetModeCommand(
  config: CliConfig,
  address: string,
  mode: string,
  options: WalletSetModeOptions = {},
): Promise<void> {
  const targetMode = normalizeSigningMode(mode);
  const chainType = options.chainType?.trim().toLowerCase() || "evm";
  if (chainType !== "evm") {
    fatal("`wallet set-mode` currently signs EVM authorization permits.");
  }

  const cli = requireActiveCli(config);
  const privateKey = config.privateKey ?? cli.privateKey;
  if (!privateKey) {
    fatal(
      "No EVM private key configured.\n" +
        "Run `aomi wallet dev-key <evm-private-key>` or pass `--private-key`.",
    );
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  if (account.address.toLowerCase() !== address.trim().toLowerCase()) {
    fatal(
      "`wallet set-mode` must be signed by the target wallet. " +
        `Configured key resolves to ${account.address}.`,
    );
  }

  const session = cli.createClientSession(config);
  try {
    const challenge = await session.client.createAuthorizationChallenge(
      cli.sessionId,
      {
        chain_type: chainType,
        wallet: address,
        mode: targetMode,
      },
    );
    const signArgs = toViemSignTypedDataArgs({
      typed_data: challenge.typed_data as WalletEip712Payload["typed_data"],
    });
    if (!signArgs) {
      fatal(
        "Backend authorization challenge did not include EIP-712 typed data.",
      );
    }
    const signature = await account.signTypedData(signArgs as never);
    const state = await session.client.commitAuthorization(cli.sessionId, {
      permit: challenge.permit,
      signature,
    });
    console.log(
      `Wallet ${state.address} (${state.chain_type}) mode set to ${state.signing_mode}.`,
    );
    console.log(`Authorization version: ${state.authorization_version}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}
