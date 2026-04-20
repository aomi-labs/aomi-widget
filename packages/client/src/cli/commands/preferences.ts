import { privateKeyToAccount } from "viem/accounts";
import { CliSession } from "../cli-session";
import { printDataFileLocation } from "../output";
import { normalizePrivateKey, parseChainId } from "../validation";
import { fatal } from "../errors";

function loadOrCreateForSettings(): CliSession {
  // Settings commands (`wallet set`, `chain set`, `config set-backend`) only
  // mutate the one field they were given. Reuse any existing session verbatim;
  // if none exists, create an empty one with minimal defaults. Never fold a
  // default baseUrl/app through mergeConfig — that would clobber a previously-
  // set backend URL whenever a different settings command runs.
  const existing = CliSession.load();
  if (existing) return existing;
  return CliSession.loadOrCreate({
    baseUrl: "https://api.aomi.dev",
    app: "default",
    secrets: {},
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

  const cli = loadOrCreateForSettings();
  cli.setBaseUrl(trimmed);
  console.log(`Backend set to ${trimmed}`);
  printDataFileLocation();
}
