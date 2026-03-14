import { createControlClient, getOrCreateSession, applyModelSelection } from "../context";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import { readState } from "../state";
import type { CliRuntime } from "../types";

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
          namespace: state.namespace,
          model: state.model ?? null,
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

export async function modelsCommand(runtime: CliRuntime): Promise<void> {
  const client = createControlClient(runtime);
  const state = readState();
  const sessionId = state?.sessionId ?? crypto.randomUUID();
  const models = await client.getModels(sessionId);

  if (models.length === 0) {
    console.log("No models available.");
    return;
  }

  for (const model of models) {
    const marker = state?.model === model ? "  (current)" : "";
    console.log(`${model}${marker}`);
  }
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

  if (subcommand !== "set") {
    fatal("Usage: aomi model set <rig>\n       aomi model current");
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
