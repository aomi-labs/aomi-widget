export type StoredProviderKey = {
  apiKey: string;
  keyPrefix: string;
  label?: string;
};

export function normalizeProviderKeys(
  value: unknown,
): Record<string, StoredProviderKey> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const normalized: Record<string, StoredProviderKey> = {};

  for (const [provider, entry] of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Partial<StoredProviderKey>;
    if (
      typeof record.apiKey !== "string" ||
      typeof record.keyPrefix !== "string"
    ) {
      continue;
    }

    normalized[provider] = {
      apiKey: record.apiKey,
      keyPrefix: record.keyPrefix,
      label: typeof record.label === "string" ? record.label : undefined,
    };
  }

  return normalized;
}
