import { AomiClient } from "../client";
import { ClientSession } from "../session";
import type { CliRuntime } from "./types";
import { readState, writeState, type CliSessionState } from "./state";
import { buildCliUserState } from "./user-state";

export function getOrCreateSession(
  runtime: CliRuntime,
): { session: ClientSession; state: CliSessionState } {
  const { config } = runtime;

  let state = readState();
  if (!state) {
    state = {
      sessionId: crypto.randomUUID(),
      clientId: crypto.randomUUID(),
      baseUrl: config.baseUrl,
      app: config.app,
      apiKey: config.apiKey,
      publicKey: config.publicKey,
      chainId: config.chain,
    };
    writeState(state);
  } else {
    let changed = false;
    if (!state.clientId) {
      state.clientId = crypto.randomUUID();
      changed = true;
    }
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
    if (config.chain !== undefined && config.chain !== state.chainId) {
      state.chainId = config.chain;
      changed = true;
    }
    if (changed) writeState(state);
  }

  const session = new ClientSession(
    { baseUrl: state.baseUrl, apiKey: state.apiKey },
    {
      sessionId: state.sessionId,
      clientId: state.clientId,
      app: state.app,
      apiKey: state.apiKey,
      publicKey: state.publicKey,
    },
  );

  const userState = buildCliUserState(state.publicKey, state.chainId);
  if (userState) {
    session.resolveUserState(userState);
  }

  return { session, state };
}

export function createControlClient(runtime: CliRuntime): AomiClient {
  return new AomiClient({
    baseUrl: runtime.config.baseUrl,
    apiKey: runtime.config.apiKey,
  });
}

export async function ingestSecretsIfPresent(
  runtime: CliRuntime,
  state: CliSessionState,
  client = createControlClient(runtime),
): Promise<Record<string, string>> {
  const secretNames = Object.keys(runtime.config.secrets);
  if (secretNames.length === 0) {
    return {};
  }

  const { handles } = await client.ingestSecrets(
    state.clientId,
    runtime.config.secrets,
  );
  state.secretHandles = {
    ...(state.secretHandles ?? {}),
    ...handles,
  };
  writeState(state);

  return handles;
}

export async function applyModelSelection(
  session: ClientSession,
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
  session: ClientSession,
  state: CliSessionState,
): Promise<void> {
  const requestedModel = runtime.config.model;
  if (!requestedModel || requestedModel === state.model) {
    return;
  }
  await applyModelSelection(session, state, requestedModel);
}
