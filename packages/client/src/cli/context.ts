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
      app: config.app,
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
    if (config.app !== state.app) {
      state.app = config.app;
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
      app: state.app,
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
    app: state.app,
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
