export function resolveAppsApiKey(
  currentApiKey: string | null | undefined,
  nextApiKey?: string | null,
): string | null {
  return nextApiKey?.trim() || currentApiKey?.trim() || null;
}
