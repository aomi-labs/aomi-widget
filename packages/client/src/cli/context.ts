import { AomiClient } from "../client";
import { Session } from "../session";
import type { CliRuntime } from "./types";
import { readState, writeState, type CliSessionState } from "./state";

export function getOrCreateSession(
  runtime: CliRuntime,
): { session: Session; state: CliSessionState } {
  const { config } = runtime;

  let state = readState();
  if (!state) {
    state = {
      sessionId: crypto.randomUUID(),
      baseUrl: config.baseUrl,
      namespace: config.namespace,
      apiKey: config.apiKey,
      publicKey: config.publicKey,
    };
    writeState(state);
  } else {
    let changed = false;
    if (config.baseUrl !== state.baseUrl) {
      state.baseUrl = config.baseUrl;
      changed = true;
    }
    if (config.namespace !== state.namespace) {
      state.namespace = config.namespace;
      changed = true;
    }
    if (config.apiKey !== undefined && config.apiKey !== state.apiKey) {
      state.apiKey = config.apiKey;
      changed = true;
    }
    if (config.publicKey !== undefined && config.publicKey !== state.publicKey) {
      state.publicKey = config.publicKey;
      changed = true;
    }
    if (changed) writeState(state);
  }

  const session = new Session(
    { baseUrl: state.baseUrl, apiKey: state.apiKey },
    {
      sessionId: state.sessionId,
      namespace: state.namespace,
      apiKey: state.apiKey,
      publicKey: state.publicKey,
      userState: state.publicKey
        ? {
            address: state.publicKey,
            chainId: 1,
            isConnected: true,
          }
        : undefined,
    },
  );

  return { session, state };
}

export function createControlClient(runtime: CliRuntime): AomiClient {
  return new AomiClient({
    baseUrl: runtime.config.baseUrl,
    apiKey: runtime.config.apiKey,
  });
}

export async function applyModelSelection(
  session: Session,
  state: CliSessionState,
  model: string,
): Promise<void> {
  await session.client.setModel(state.sessionId, model, {
    namespace: state.namespace,
    apiKey: state.apiKey,
  });
  state.model = model;
  writeState(state);
}

export async function applyRequestedModelIfPresent(
  runtime: CliRuntime,
  session: Session,
  state: CliSessionState,
): Promise<void> {
  const requestedModel = runtime.config.model;
  if (!requestedModel || requestedModel === state.model) {
    return;
  }
  await applyModelSelection(session, state, requestedModel);
}
