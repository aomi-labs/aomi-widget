import { AomiClient } from "../client";
import type { AomiIngestSecretsResponse } from "../types";
import type { ClientSession } from "../session";
import type { CliConfig } from "./types";
import type { CliSession } from "./cli-session";
import { createCliAuthTokenProvider } from "./auth";
import {
  createCliGetAccountBearer,
  DEFAULT_CLI_BASE_URL,
} from "./client-factory";
import { createCliPaymentFetch, type CliPaymentListener } from "./payment";
import { readState } from "./state";

export function createControlClient(
  config: CliConfig,
  options: { payment?: boolean; onPayment?: CliPaymentListener } = {},
): AomiClient {
  return new AomiClient({
    baseUrl: config.baseUrl ?? DEFAULT_CLI_BASE_URL,
    apiKey: config.apiKey,
    fetch: options.payment
      ? createCliPaymentFetch(config, options.onPayment)
      : undefined,
    getAccountBearer:
      createCliGetAccountBearer(config) ??
      createCliAuthTokenProvider(() => readState() ?? {}),
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

  // ClientSession carries the model on the canonical Agent start request.
  // Retain this helper only to persist the CLI preference; it must not issue a
  // second legacy control mutation before chat.
  void session;
  cli.setModel(requestedModel);
}
