const DEFAULT_ALCHEMY_API_KEY = "72eIUle_3rfixX00QJVwk";
const DEFAULT_ALCHEMY_GAS_POLICY_ID = "fb17d7d7-9a32-479d-937a-52d72b849c40";

function trimToUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveAlchemyApiKey(options?: {
  apiKey?: string;
  publicOnly?: boolean;
}): string {
  const explicit = trimToUndefined(options?.apiKey);
  if (explicit) return explicit;

  if (!options?.publicOnly) {
    const privateEnv = trimToUndefined(process.env.ALCHEMY_API_KEY);
    if (privateEnv) return privateEnv;
  }

  const publicEnv = trimToUndefined(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
  if (publicEnv) return publicEnv;

  return DEFAULT_ALCHEMY_API_KEY;
}

export function resolveAlchemyGasPolicyId(options?: {
  gasPolicyId?: string;
  publicOnly?: boolean;
}): string {
  const explicit = trimToUndefined(options?.gasPolicyId);
  if (explicit) return explicit;

  if (!options?.publicOnly) {
    const privateEnv = trimToUndefined(process.env.ALCHEMY_GAS_POLICY_ID);
    if (privateEnv) return privateEnv;
  }

  const publicEnv = trimToUndefined(process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID);
  if (publicEnv) return publicEnv;

  return DEFAULT_ALCHEMY_GAS_POLICY_ID;
}

