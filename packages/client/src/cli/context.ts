import { AomiClient } from "../client";
import type { AomiIngestSecretsResponse } from "../types";
import type { ClientSession } from "../session";
import type { CliConfig } from "./types";
import type { CliSession } from "./cli-session";

export function createControlClient(config: CliConfig): AomiClient {
  return new AomiClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
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
  if (!requestedModel || requestedModel === cli.model) {
    return;
  }

  await session.client.setModel(cli.sessionId, requestedModel, {
    app: cli.app,
    apiKey: cli.apiKey,
  });
  cli.setModel(requestedModel);
}
