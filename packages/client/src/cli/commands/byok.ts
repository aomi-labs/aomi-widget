import { AomiClient } from "../../client";
import type { CliConfig } from "../types";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";

const SUPPORTED_PROVIDERS = new Set(["openai", "anthropic", "openrouter"]);

function parseProviderKeyArg(input: string): { provider: string; apiKey: string } {
  const [providerPart, apiKeyPart] = input.split(/:(.+)/, 2);
  const provider = providerPart?.trim().toLowerCase();
  const apiKey = apiKeyPart?.trim();

  if (!provider || !apiKey) {
    fatal(
      "Invalid format. Use: <provider>:<key> (e.g. anthropic:sk-ant-...)",
    );
  }

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    fatal(
      `Unknown provider "${provider}". Supported: anthropic, openai, openrouter`,
    );
  }

  return { provider, apiKey };
}

async function createProviderKeyClient(
  config: CliConfig,
): Promise<{ cli: CliSession; client: AomiClient }> {
  const cli = CliSession.loadOrCreate(config);
  const client = new AomiClient({
    baseUrl: cli.baseUrl,
    apiKey: cli.apiKey,
  });

  // Bind the active session to the stable client id in the backend vault so
  // provider-key endpoints can resolve the right SecretVault namespace.
  await client.fetchState(cli.sessionId, undefined, cli.ensureClientId());

  return { cli, client };
}

export async function saveProviderKeyCommand(
  config: CliConfig,
  providerKey: string,
  options?: { printLocation?: boolean },
): Promise<void> {
  const { provider, apiKey } = parseProviderKeyArg(providerKey);
  const { cli, client } = await createProviderKeyClient(config);
  const saved = await client.saveProviderKey(cli.sessionId, provider, apiKey);

  console.log(`BYOK key set for ${saved.provider}: ${saved.key_prefix}...`);
  if (options?.printLocation !== false) {
    printDataFileLocation();
  }
}

export async function showProviderKeysCommand(
  config: CliConfig,
  options?: { printLocation?: boolean },
): Promise<void> {
  const { cli, client } = await createProviderKeyClient(config);
  const providerKeys = await client.listProviderKeys(cli.sessionId);

  if (providerKeys.length === 0) {
    console.log("No BYOK provider keys set. Using system keys.");
  } else {
    for (const key of providerKeys) {
      console.log(`  ${key.provider}: ${key.key_prefix}...`);
    }
  }

  if (options?.printLocation !== false) {
    printDataFileLocation();
  }
}

export async function clearProviderKeysCommand(
  config: CliConfig,
  options?: { printLocation?: boolean },
): Promise<void> {
  const { cli, client } = await createProviderKeyClient(config);
  const providerKeys = await client.listProviderKeys(cli.sessionId);

  if (providerKeys.length === 0) {
    console.log("No BYOK provider keys set. Using system keys.");
    if (options?.printLocation !== false) {
      printDataFileLocation();
    }
    return;
  }

  for (const key of providerKeys) {
    await client.deleteProviderKey(cli.sessionId, key.provider);
  }

  console.log("BYOK provider keys cleared. Using system keys.");
  if (options?.printLocation !== false) {
    printDataFileLocation();
  }
}
