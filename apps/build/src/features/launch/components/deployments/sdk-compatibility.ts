import type { UserSource } from "@aomi-labs/deploy";

export type SdkCompatibility = "current" | "outdated" | "unknown";

export function sourceSdkVersion(source: UserSource): string | null {
  return (
    source.sdkVersion ??
    source.latestDeployment?.sdkVersion ??
    source.latestDeployment?.apps.find((app) => app.sdkVersion)?.sdkVersion ??
    null
  );
}

export function sdkCompatibility(
  stamped?: string | null,
  required?: string | null,
): SdkCompatibility {
  if (!stamped || !required) return "unknown";
  return stamped === required ? "current" : "outdated";
}
