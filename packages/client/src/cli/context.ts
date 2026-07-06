import { AomiClient } from "../client";
import type { AomiIngestSecretsResponse } from "../types";
import type { ClientSession } from "../session";
import type { CliConfig } from "./types";
import type { CliSession } from "./cli-session";
import { createCliAuthTokenProvider } from "./auth";
import { readState } from "./state";

export function createControlClient(config: CliConfig): AomiClient {
  return new AomiClient({
    baseUrl: config.baseUrl ?? "https://api.aomi.dev",
    apiKey: config.apiKey,
    getAccountBearer: createCliAuthTokenProvider(() => readState() ?? {}),
  });
}

export async function ingestSecretsForSession(
  config: CliConfig,
  cli: CliSession,
  client: AomiClient,
): Promise<Record<string, string>> {
  const secrets = config.secrets;
  if (Object.keys(secrets).length === 0) return {};

  const clientId = cli.ensureClientId();

  const response: AomiIngestSecretsResponse = await client.ingestSecrets(
    cli.sessionId,
    clientId,
    secrets,
  );

  cli.addSecretHandles(response.handles);
  return response.handles;
}

export async function applyRequestedModelIfPresent(
  config: CliConfig,
  cli: CliSession,
  session: ClientSession,
): Promise<void> {
  const requestedModel = config.model;
  if (!requestedModel) {
    return;
  }

  // Push the model to the backend unless it's already been synced this session.
  // cli.modelSynced tracks whether we've actually called setModel on the current
  // backend session. For a brand-new session the backend starts with the app's
  // default model, so we must push even if cli.model already matches locally.
  const alreadySynced = cli.modelSynced && requestedModel === cli.model;
  if (alreadySynced) {
    return;
  }

  await session.client.setModel(cli.sessionId, requestedModel, {
    app: cli.app,
    apiKey: cli.apiKey,
  });
  cli.setModel(requestedModel);
}
