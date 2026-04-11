import type { Chain } from "viem";
import * as viemChains from "viem/chains";

import {
  ALCHEMY_API_KEY_ENVS,
  ALCHEMY_GAS_POLICY_ENVS,
  PIMLICO_API_KEY_ENVS,
  createAAProviderState,
  readEnv,
  resolveAlchemyConfig,
  resolvePimlicoConfig,
} from "../../aa";
import {
  clearAAConfig,
  getPersistedAAApiKey,
  getPersistedAlchemyGasPolicyId,
  readAAConfig,
  SETTABLE_AA_FIELDS,
  setAAConfigValue,
  writeAAConfig,
} from "../aa-config";
import { SUPPORTED_CHAIN_IDS, CHAIN_NAMES } from "../args";
import { fatal } from "../errors";
import { DIM, GREEN, RESET, YELLOW, printDataFileLocation } from "../output";
import type { CliAAProvider, CliRuntime } from "../types";

function maskSecret(value: string): string {
  return value.slice(0, 6) + "..." + value.slice(-4);
}

function getCliAAApiKey(provider: CliAAProvider): string | undefined {
  const config = readAAConfig();
  if (provider === "alchemy") {
    return readEnv(ALCHEMY_API_KEY_ENVS) ?? getPersistedAAApiKey(config, "alchemy");
  }
  return readEnv(PIMLICO_API_KEY_ENVS) ?? getPersistedAAApiKey(config, "pimlico");
}

function getCliAlchemyGasPolicyId(): string | undefined {
  const config = readAAConfig();
  return readEnv(ALCHEMY_GAS_POLICY_ENVS) ?? getPersistedAlchemyGasPolicyId(config);
}

function resolveChain(chainId: number): Chain {
  return (
    Object.values(viemChains).find(
      (candidate): candidate is Chain =>
        typeof candidate === "object" &&
        candidate !== null &&
        "id" in candidate &&
        (candidate as { id: number }).id === chainId,
    ) ?? {
      id: chainId,
      name: CHAIN_NAMES[chainId] ?? `Chain ${chainId}`,
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: [],
        },
      },
    }
  );
}

function normalizePrivateKey(value: string | undefined): `0x${string}` | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

// ---------------------------------------------------------------------------
// aomi aa status
// ---------------------------------------------------------------------------

export async function aaStatusCommand(_runtime: CliRuntime): Promise<void> {
  const config = readAAConfig();
  const alchemyApiKey = getCliAAApiKey("alchemy");
  const pimlicoApiKey = getCliAAApiKey("pimlico");
  const alchemyGasPolicyId = getCliAlchemyGasPolicyId();
  const hasConfig =
    Object.keys(config).length > 0 ||
    Boolean(alchemyApiKey) ||
    Boolean(pimlicoApiKey) ||
    Boolean(alchemyGasPolicyId);

  if (!hasConfig) {
    console.log("No AA configuration set.");
    console.log(`${DIM}Run \`aomi aa set provider alchemy\` to get started.${RESET}`);
    printDataFileLocation();
    return;
  }

  console.log(`${YELLOW}AA Configuration:${RESET}`);
  if (config.provider) console.log(`  provider:     ${config.provider}`);
  if (config.mode) console.log(`  mode:         ${config.mode}`);
  if (config.fallback) console.log(`  fallback:     ${config.fallback}`);

  const storedAlchemyKey = getPersistedAAApiKey(config, "alchemy");
  if (alchemyApiKey) {
    console.log(
      `  alchemy key:  ${maskSecret(alchemyApiKey)}${storedAlchemyKey === alchemyApiKey ? " (stored)" : " (env)"}`,
    );
  }
  if (alchemyGasPolicyId) {
    console.log(
      `  gas policy:   ${alchemyGasPolicyId}${getPersistedAlchemyGasPolicyId(config) === alchemyGasPolicyId ? " (stored)" : " (env)"}`,
    );
  }

  const storedPimlicoKey = getPersistedAAApiKey(config, "pimlico");
  if (pimlicoApiKey) {
    console.log(
      `  pimlico key:  ${maskSecret(pimlicoApiKey)}${storedPimlicoKey === pimlicoApiKey ? " (stored)" : " (env)"}`,
    );
  }

  console.log();
  console.log(`${DIM}Supported chains:${RESET}`);
  for (const id of SUPPORTED_CHAIN_IDS) {
    const name = CHAIN_NAMES[id] ?? `Chain ${id}`;
    console.log(`  ${id}  ${name}`);
  }

  printDataFileLocation();
}

// ---------------------------------------------------------------------------
// aomi aa set <key> <value>
// ---------------------------------------------------------------------------

export async function aaSetCommand(key: string, value: string): Promise<void> {
  const config = readAAConfig();

  try {
    const next = setAAConfigValue(config, key, value);
    writeAAConfig(next);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fatal(
      message.includes("Unknown AA config key")
        ? `${message}`
        : `${message}\nValid keys: ${SETTABLE_AA_FIELDS.join(", ")}`,
    );
  }

  console.log(
    `${GREEN}✓${RESET} Set ${key} = ${key.includes("key") ? maskSecret(value) : value}`,
  );
  printDataFileLocation();
}

// ---------------------------------------------------------------------------
// aomi aa test [--chain <id>]
// ---------------------------------------------------------------------------

export async function aaTestCommand(chainId?: number): Promise<void> {
  const config = readAAConfig();
  const provider = config.provider;

  if (!provider) {
    fatal(
      "No AA provider configured.\nRun `aomi aa set provider alchemy` first.",
    );
  }

  const apiKey = getCliAAApiKey(provider);
  if (!apiKey) {
    fatal(
      `No API key for ${provider}.\nRun \`aomi aa set key <your-key>\` or set ${provider === "alchemy" ? "ALCHEMY_API_KEY" : "PIMLICO_API_KEY"}.`,
    );
  }

  const chain = resolveChain(chainId ?? 8453);
  const calls = [
    {
      to: "0x1111111111111111111111111111111111111111",
      value: "0",
      chainId: chain.id,
    },
  ];

  const resolved =
    provider === "alchemy"
      ? resolveAlchemyConfig({
          calls,
          chainsById: { [chain.id]: chain },
          modeOverride: config.mode,
          throwOnMissingConfig: true,
          apiKey,
          gasPolicyId: getCliAlchemyGasPolicyId(),
        })
      : resolvePimlicoConfig({
          calls,
          chainsById: { [chain.id]: chain },
          modeOverride: config.mode,
          throwOnMissingConfig: true,
          apiKey,
        });

  if (!resolved) {
    fatal(`Unable to resolve ${provider} AA configuration.`);
  }

  console.log(`Testing ${provider} AA on chain ${chain.id} (${chain.name})...`);
  console.log(`${GREEN}✓${RESET} Provider: ${provider}`);
  console.log(`${GREEN}✓${RESET} API key: ${maskSecret(apiKey)}`);
  console.log(`${GREEN}✓${RESET} Mode: ${resolved.mode}`);
  console.log(`${GREEN}✓${RESET} Batching: ${resolved.batchingEnabled ? "enabled" : "disabled"}`);
  console.log(`${GREEN}✓${RESET} Sponsorship: ${resolved.sponsorship}`);

  if (provider === "alchemy") {
    console.log(
      `${GREEN}✓${RESET} Gas policy: ${resolved.gasPolicyId ?? "(none configured, unsponsored AA only)"}`,
    );
  }

  const privateKey = normalizePrivateKey(process.env.PRIVATE_KEY);
  if (!privateKey) {
    console.log(
      `${DIM}No PRIVATE_KEY set, so smart-account instantiation was skipped.${RESET}`,
    );
    return;
  }

  const state = await createAAProviderState({
    provider,
    chain,
    owner: { kind: "direct", privateKey },
    rpcUrl:
      provider === "alchemy"
        ? resolved.rpcUrl
        : resolved.rpcUrl ?? chain.rpcUrls.default.http[0] ?? "",
    callList: calls,
    mode: resolved.mode,
    apiKey,
    gasPolicyId: provider === "alchemy" ? resolved.gasPolicyId : undefined,
  });

  if (state.error) {
    fatal(`Smart-account creation failed: ${state.error.message}`);
  }

  console.log(`${GREEN}✓${RESET} Smart account created.`);
  if (state.account?.AAAddress) {
    console.log(`${GREEN}✓${RESET} AA address: ${state.account.AAAddress}`);
  }
  if (state.account?.delegationAddress) {
    console.log(`${GREEN}✓${RESET} Delegation: ${state.account.delegationAddress}`);
  }
}

// ---------------------------------------------------------------------------
// aomi aa reset
// ---------------------------------------------------------------------------

export async function aaResetCommand(): Promise<void> {
  clearAAConfig();
  console.log("AA configuration cleared.");
  printDataFileLocation();
}
