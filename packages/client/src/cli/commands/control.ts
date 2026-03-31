import { SUPPORTED_CHAIN_IDS, CHAIN_NAMES } from "../args";
import { createControlClient, getOrCreateSession, applyModelSelection } from "../context";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import { readState } from "../state";
import type { CliRuntime } from "../types";
import { DEFAULT_AA_CONFIG } from "../../aa/types";

export async function statusCommand(runtime: CliRuntime): Promise<void> {
  if (!readState()) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }

  const { session, state } = getOrCreateSession(runtime);

  try {
    const apiState = await session.client.fetchState(state.sessionId);
    console.log(
      JSON.stringify(
        {
          sessionId: state.sessionId,
          baseUrl: state.baseUrl,
          app: state.app,
          model: state.model ?? null,
          chainId: state.chainId ?? null,
          isProcessing: apiState.is_processing ?? false,
          messageCount: apiState.messages?.length ?? 0,
          title: apiState.title ?? null,
          pendingTxs: state.pendingTxs?.length ?? 0,
          signedTxs: state.signedTxs?.length ?? 0,
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

export async function eventsCommand(runtime: CliRuntime): Promise<void> {
  if (!readState()) {
    console.log("No active session");
    return;
  }

  const { session, state } = getOrCreateSession(runtime);

  try {
    const events = await session.client.getSystemEvents(state.sessionId);
    console.log(JSON.stringify(events, null, 2));
  } finally {
    session.close();
  }
}

export async function appsCommand(runtime: CliRuntime): Promise<void> {
  const client = createControlClient(runtime);
  const state = readState();
  const sessionId = state?.sessionId ?? crypto.randomUUID();
  const apps = await client.getApps(sessionId, {
    publicKey: runtime.config.publicKey,
    apiKey: runtime.config.apiKey ?? state?.apiKey,
  });

  if (apps.length === 0) {
    console.log("No apps available.");
    return;
  }

  const currentApp = state?.app ?? runtime.config.app;
  for (const app of apps) {
    const marker = currentApp === app ? "  (current)" : "";
    console.log(`${app}${marker}`);
  }
}

export async function modelsCommand(runtime: CliRuntime): Promise<void> {
  const client = createControlClient(runtime);
  const state = readState();
  const sessionId = state?.sessionId ?? crypto.randomUUID();
  const models = await client.getModels(sessionId, {
    apiKey: runtime.config.apiKey ?? state?.apiKey,
  });

  if (models.length === 0) {
    console.log("No models available.");
    return;
  }

  for (const model of models) {
    const marker = state?.model === model ? "  (current)" : "";
    console.log(`${model}${marker}`);
  }
}

export async function appCommand(runtime: CliRuntime): Promise<void> {
  const subcommand = runtime.parsed.positional[0];

  if (!subcommand || subcommand === "current") {
    const state = readState();
    if (!state) {
      console.log("No active session");
      printDataFileLocation();
      return;
    }
    console.log(state.app ?? "(default)");
    printDataFileLocation();
    return;
  }

  if (subcommand === "list") {
    await appsCommand(runtime);
    return;
  }

  fatal("Usage: aomi app list\n       aomi app current");
}

export async function modelCommand(runtime: CliRuntime): Promise<void> {
  const subcommand = runtime.parsed.positional[0];

  if (!subcommand || subcommand === "current") {
    const state = readState();
    if (!state) {
      console.log("No active session");
      printDataFileLocation();
      return;
    }
    console.log(state.model ?? "(default backend model)");
    printDataFileLocation();
    return;
  }

  if (subcommand === "list") {
    await modelsCommand(runtime);
    return;
  }

  if (subcommand !== "set") {
    fatal("Usage: aomi model list\n       aomi model set <rig>\n       aomi model current");
  }

  const model = runtime.parsed.positional.slice(1).join(" ").trim();
  if (!model) {
    fatal("Usage: aomi model set <rig>");
  }

  const { session, state } = getOrCreateSession(runtime);

  try {
    await applyModelSelection(session, state, model);
    console.log(`Model set to ${model}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export function chainsCommand(): void {
  const state = readState();
  const currentChainId = state?.chainId;

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

export function chainCommand(runtime: CliRuntime): void {
  const subcommand = runtime.parsed.positional[0];

  if (!subcommand || subcommand === "list") {
    chainsCommand();
    return;
  }

  fatal("Usage: aomi chain list");
}
