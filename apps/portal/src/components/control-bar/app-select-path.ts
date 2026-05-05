export type AppsRequest = {
  path: string;
  apiKey: string | null;
};

export function buildAppsRequest(
  publicKey: string | null | undefined,
  apiKey: string | null | undefined,
): AppsRequest {
  const trimmedApiKey = apiKey?.trim() || null;
  if (trimmedApiKey) {
    return {
      path: "/api/control/apps",
      apiKey: trimmedApiKey,
    };
  }

  if (publicKey) {
    return {
      path: `/api/control/apps?public_key=${encodeURIComponent(publicKey)}`,
      apiKey: null,
    };
  }

  return {
    path: "/api/control/apps",
    apiKey: null,
  };
}
