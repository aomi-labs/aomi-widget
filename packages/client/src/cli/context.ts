import { AomiClient } from "../client";
import type { AomiIngestSecretsResponse } from "../types";
import { ClientSession } from "../session";
import type { CliConfig } from "./types";
import { readState, writeState, type CliSessionState } from "./state";
import { buildCliUserState } from "./user-state";

function buildSessionState(config: CliConfig): CliSessionState {
  return {
    sessionId: crypto.randomUUID(),
    baseUrl: config.baseUrl,
    app: config.app,
    model: config.model,
    apiKey: config.apiKey,
    publicKey: config.publicKey,
    chainId: config.chain,
    clientId: crypto.randomUUID(),
  };
}

export function createFreshSessionState(config: CliConfig): CliSessionState {
  const state = buildSessionState(config);
  writeState(state);
  return state;
}

export function getOrCreateSession(
  config: CliConfig,
  options: { fresh?: boolean } = {},
): { session: ClientSession; state: CliSessionState } {
  let state =
    options.fresh || config.freshSession
      ? createFreshSessionState(config)
      : readState();
  if (!state) {
    state = createFreshSessionState(config);
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
    if (config.chain !== undefined && config.chain !== state.chainId) {
      state.chainId = config.chain;
      changed = true;
    }
    if (!state.clientId) {
      state.clientId = crypto.randomUUID();
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

  session.resolveUserState(buildCliUserState(state.publicKey, state.chainId));

  return { session, state };
}

export function createControlClient(config: CliConfig): AomiClient {
  return new AomiClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
  });
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

export async function ingestSecretsIfPresent(
  config: CliConfig,
  state: CliSessionState,
  client: AomiClient,
): Promise<Record<string, string>> {
  const secrets = config.secrets;
  if (Object.keys(secrets).length === 0) return {};

  if (!state.clientId) {
    state.clientId = crypto.randomUUID();
    writeState(state);
  }

  const response: AomiIngestSecretsResponse = await client.ingestSecrets(
    state.clientId,
    secrets,
  );

  state.secretHandles = { ...(state.secretHandles ?? {}), ...response.handles };
  writeState(state);

  return response.handles;
}

export async function applyRequestedModelIfPresent(
  config: CliConfig,
  session: ClientSession,
  state: CliSessionState,
): Promise<void> {
  const requestedModel = config.model;
  if (!requestedModel || requestedModel === state.model) {
    return;
  }
  await applyModelSelection(session, state, requestedModel);
}
