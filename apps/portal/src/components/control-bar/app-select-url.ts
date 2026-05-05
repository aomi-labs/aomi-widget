const URL_APP_QUERY_KEYS = ["aomi_app", "app"] as const;

export function getRequestedAppFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);

  for (const key of URL_APP_QUERY_KEYS) {
    const value = params.get(key)?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}
