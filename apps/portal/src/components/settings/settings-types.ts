export type SettingsCategory =
  | "general"
  | "apps"
  | "app-keys"
  | "bots"
  | "secrets"
  | "byok";

export const SETTINGS_QUERY_KEY = "settings";

export function parseSettingsCategory(
  value: string | null | undefined,
): SettingsCategory | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "general" ||
    normalized === "apps" ||
    normalized === "usage" ||
    normalized === "app-keys" ||
    normalized === "bots" ||
    normalized === "secrets" ||
    normalized === "byok"
  ) {
    if (normalized === "usage") return "apps";
    return normalized as SettingsCategory;
  }
  return null;
}
