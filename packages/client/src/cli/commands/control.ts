import { SUPPORTED_CHAIN_IDS, CHAIN_NAMES } from "../../chains";
import { CliSession } from "../cli-session";
import { createControlClient } from "../context";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";
import { DEFAULT_AA_CONFIG } from "../../aa/types";

export async function statusCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);

  const session = cli.createClientSession();
  try {
    const apiState = await session.client.fetchState(cli.sessionId, undefined, cli.clientId);
    console.log(
      JSON.stringify(
        {
          sessionId: cli.sessionId,
          baseUrl: cli.baseUrl,
          app: cli.app,
          model: cli.model ?? null,
          chainId: cli.chainId ?? null,
          isProcessing: apiState.is_processing ?? false,
          messageCount: apiState.messages?.length ?? 0,
          title: apiState.title ?? null,
          pendingTxs: cli.pendingTxs.length,
          signedTxs: cli.signedTxs.length,
        },
        null,
        2,
      ),
    );
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export async function eventsCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    return;
  }
  cli.mergeConfig(config);

  const session = cli.createClientSession();
  try {
    const events = await session.client.getSystemEvents(cli.sessionId);
    console.log(JSON.stringify(events, null, 2));
  } finally {
    session.close();
  }
}

export async function appsCommand(config: CliConfig): Promise<void> {
  const client = createControlClient(config);
  const cli = CliSession.load();
  const sessionId = cli?.sessionId ?? crypto.randomUUID();
  const apps = await client.getApps(sessionId, {
    publicKey: config.publicKey ?? cli?.publicKey,
    apiKey: config.apiKey ?? cli?.apiKey,
  });

  if (apps.length === 0) {
    console.log("No apps available.");
    return;
  }

  const currentApp = cli?.app ?? config.app;
  for (const app of apps) {
    const marker = currentApp === app ? "  (current)" : "";
    console.log(`${app}${marker}`);
  }
}

export async function modelsCommand(config: CliConfig): Promise<void> {
  const client = createControlClient(config);
  const cli = CliSession.load();
  const sessionId = cli?.sessionId ?? crypto.randomUUID();
  const models = await client.getModels(sessionId, {
    apiKey: config.apiKey ?? cli?.apiKey,
  });

  if (models.length === 0) {
    console.log("No models available.");
    return;
  }

  for (const model of models) {
    const marker = cli?.model === model ? "  (current)" : "";
    console.log(`${model}${marker}`);
  }
}

export function currentAppCommand(): void {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  console.log(cli.app ?? "(default)");
  printDataFileLocation();
}

export function currentChainCommand(): void {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  if (cli.chainId === undefined) {
    console.log("No active chain");
  } else {
    console.log(String(cli.chainId));
  }
  printDataFileLocation();
}

export function currentBackendCommand(): void {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  console.log(cli.baseUrl);
  printDataFileLocation();
}

export function currentWalletCommand(): void {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  if (!cli.publicKey) {
    console.log("No wallet configured");
    printDataFileLocation();
    return;
  }
  const signerStatus = cli.privateKey ? "saved signer" : "address only";
  console.log(`${cli.publicKey} (${signerStatus})`);
  printDataFileLocation();
}

export function currentModelCommand(): void {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  console.log(cli.model ?? "(default backend model)");
  printDataFileLocation();
}

export async function setModelCommand(config: CliConfig, model: string): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession();
  try {
    await session.client.setModel(cli.sessionId, model, {
      app: cli.app,
      apiKey: cli.apiKey,
    });
    cli.setModel(model);
    console.log(`Model set to ${model}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export function chainsCommand(): void {
  const cli = CliSession.load();
  const currentChainId = cli?.chainId;

  for (const id of SUPPORTED_CHAIN_IDS) {
    const name = CHAIN_NAMES[id] ?? `Chain ${id}`;
    const aaChain = DEFAULT_AA_CONFIG.chains.find((c) => c.chainId === id);
    const aaInfo = aaChain?.enabled
      ? `  AA: ${aaChain.defaultMode} (${aaChain.supportedModes.join(", ")})`
      : "";
    const marker = currentChainId === id ? "  (current)" : "";
    console.log(`${id}  ${name}${aaInfo}${marker}`);
  }
}
