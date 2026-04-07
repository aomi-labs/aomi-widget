import { AomiClient } from "../client";
import type { AomiIngestSecretsResponse } from "../types";
import { ClientSession } from "../session";
import type { CliRuntime } from "./types";
import { readState, writeState, type CliSessionState } from "./state";
import { buildCliUserState } from "./user-state";

export function getOrCreateSession(
  runtime: CliRuntime,
): { session: ClientSession; state: CliSessionState } {
  const { config } = runtime;
  const shouldProvisionClientId = Object.keys(config.secrets).length > 0;

  let state = readState();
  if (!state) {
    state = {
      sessionId: crypto.randomUUID(),
      baseUrl: config.baseUrl,
      app: config.app,
      apiKey: config.apiKey,
      publicKey: config.publicKey,
      chainId: config.chain,
      clientId: shouldProvisionClientId ? crypto.randomUUID() : undefined,
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
    if (config.chain !== undefined && config.chain !== state.chainId) {
      state.chainId = config.chain;
      changed = true;
    }
    if (!state.clientId && (shouldProvisionClientId || Object.keys(state.secretHandles ?? {}).length > 0)) {
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
  runtime: CliRuntime,
  state: CliSessionState,
  client: AomiClient,
): Promise<Record<string, string>> {
  const secrets = runtime.config.secrets;
  if (Object.keys(secrets).length === 0) return {};

  // Ensure we have a stable clientId for this session
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
