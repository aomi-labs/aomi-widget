import { privateKeyToAccount } from "viem/accounts";
import { CliSession } from "../cli-session";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";
import { normalizePrivateKey, parseChainId } from "../validation";
import { fatal } from "../errors";

function loadOrCreateForSettings(config?: Partial<CliConfig>): CliSession {
  return CliSession.loadOrCreate({
    baseUrl: config?.baseUrl ?? "https://api.aomi.dev",
    apiKey: config?.apiKey,
    app: config?.app ?? "default",
    model: config?.model,
    freshSession: false,
    publicKey: config?.publicKey,
    privateKey: config?.privateKey,
    chainRpcUrl: config?.chainRpcUrl,
    chain: config?.chain,
    secrets: {},
    execution: config?.execution,
    aaProvider: config?.aaProvider,
    aaMode: config?.aaMode,
  });
}

export function setWalletCommand(privateKeyInput: string): void {
  const privateKey = normalizePrivateKey(privateKeyInput);
  if (!privateKey) {
    fatal("Usage: aomi wallet set <private-key>");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const cli = loadOrCreateForSettings();
  cli.setWallet(privateKey, account.address);
  console.log(`Wallet set to ${account.address}`);
  printDataFileLocation();
}

export function setChainCommand(chainIdInput: string): void {
  const chainId = parseChainId(chainIdInput);
  if (chainId === undefined) {
    fatal("Usage: aomi chain set <chain-id>");
  }

  const cli = loadOrCreateForSettings();
  cli.setChainId(chainId);
  console.log(`Chain set to ${chainId}`);
  printDataFileLocation();
}

export function setBackendCommand(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) {
    fatal("Usage: aomi config set-backend <url>");
  }

  const cli = loadOrCreateForSettings({ baseUrl: trimmed });
  cli.setBaseUrl(trimmed);
  console.log(`Backend set to ${trimmed}`);
  printDataFileLocation();
}
