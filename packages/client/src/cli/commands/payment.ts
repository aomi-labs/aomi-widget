import { AomiClient } from "../../client";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

function loadOrCreatePaymentSession(config: CliConfig): CliSession {
  const existing = CliSession.load();
  if (existing) {
    existing.mergeConfig(config);
    return existing;
  }
  return CliSession.loadOrCreate({
    baseUrl: "https://api.aomi.dev",
    app: "default",
    secrets: {},
    ...config,
  });
}

async function createPaymentClient(
  config: CliConfig,
): Promise<{ cli: CliSession; client: AomiClient }> {
  const cli = loadOrCreatePaymentSession(config);
  const client = new AomiClient({
    baseUrl: cli.baseUrl,
    apiKey: cli.apiKey,
  });

  await client.fetchState(cli.sessionId, undefined, cli.ensureClientId());
  return { cli, client };
}

export async function paymentStatusCommand(config: CliConfig): Promise<void> {
  const { cli, client } = await createPaymentClient(config);
  const overview = await client.getPaymentOverview(cli.sessionId);

  console.log(`Session: ${cli.sessionId}`);
  console.log(`Preferred method: ${cli.paymentMethod ?? "auto"}`);

  if (overview.byok.length === 0) {
    console.log("BYOK: none");
  } else {
    console.log("BYOK:");
    for (const key of overview.byok) {
      const label = key.label?.trim();
      console.log(label ? `  - ${key.provider} (${label})` : `  - ${key.provider}`);
    }
  }

  if (overview.streams.length === 0) {
    console.log("MPP: none");
  } else {
    console.log("MPP:");
    for (const stream of overview.streams) {
      console.log(`  - ${stream.method}: ${stream.receipt_id}`);
    }
  }

  printDataFileLocation();
}

export function paymentMethodsCommand(): void {
  console.log("Supported chat payment methods:");
  console.log("  - auto: legacy backend fallback when payment_method is omitted");
  console.log("  - null: use included Aomi credits when available");
  console.log("  - byok: use a cached provider key");
  console.log("  - tempo: use a cached Tempo / MPP channel");
  console.log("  - coinbase: x402 exact-payment flow handled during chat");
}

export async function paymentByokSetCommand(
  config: CliConfig,
  provider: string,
  apiKey: string,
  label?: string,
): Promise<void> {
  const normalizedProvider = provider.trim().toLowerCase();
  if (!normalizedProvider || !apiKey.trim()) {
    fatal("Usage: aomi payment byok set <provider> <api-key> [--label <label>]");
  }

  const { cli, client } = await createPaymentClient(config);
  const saved = await client.saveProviderKey(
    cli.sessionId,
    normalizedProvider,
    apiKey.trim(),
    label?.trim() || undefined,
  );
  console.log(`Saved BYOK key for ${saved.provider}: ${saved.key_prefix}...`);
  printDataFileLocation();
}

export async function paymentByokClearCommand(
  config: CliConfig,
  provider: string,
): Promise<void> {
  const normalizedProvider = provider.trim().toLowerCase();
  if (!normalizedProvider) {
    fatal("Usage: aomi payment byok clear <provider>");
  }

  const { cli, client } = await createPaymentClient(config);
  const deleted = await client.deleteProviderKey(cli.sessionId, normalizedProvider);
  console.log(
    deleted
      ? `Cleared BYOK key for ${normalizedProvider}`
      : `No cached BYOK key for ${normalizedProvider}`,
  );
  printDataFileLocation();
}

export async function paymentTempoSetCommand(
  config: CliConfig,
  channelId: string,
  voucher?: string,
): Promise<void> {
  const trimmedChannelId = channelId.trim();
  if (!trimmedChannelId) {
    fatal("Usage: aomi payment tempo set <channel-id> [--voucher <voucher>]");
  }

  const { cli, client } = await createPaymentClient(config);
  const saved = await client.saveTempoPayment(
    cli.sessionId,
    trimmedChannelId,
    voucher?.trim() || undefined,
  );
  console.log(`Cached MPP channel ${saved.receipt_id} for ${saved.method}`);
  printDataFileLocation();
}

export async function paymentTempoClearCommand(
  config: CliConfig,
): Promise<void> {
  const { cli, client } = await createPaymentClient(config);
  const deleted = await client.clearTempoPayment(cli.sessionId);
  console.log(deleted ? "Cleared cached MPP channel" : "No cached MPP channel");
  printDataFileLocation();
}
