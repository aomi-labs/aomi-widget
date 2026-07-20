import type { SecretSlot } from "@aomi-labs/deploy";

export type RequiredSecretsByApp = Record<
  string,
  { slots: SecretSlot[]; missing: string[] }
>;

export class MissingRequiredSecretsError extends Error {
  readonly missing: Record<string, string[]>;

  constructor(missing: Record<string, string[]>) {
    const names = Object.entries(missing)
      .map(([app, keys]) => `${app}: ${keys.join(", ")}`)
      .join("; ");
    super(`Missing required secrets — ${names}`);
    this.name = "MissingRequiredSecretsError";
    this.missing = missing;
  }
}

export function missingRequiredSecrets(
  byApp: RequiredSecretsByApp,
  apps: string[],
): Record<string, string[]> {
  return Object.fromEntries(
    apps
      .map((app) => [app, byApp[app]?.missing ?? []] as const)
      .filter(([, missing]) => missing.length > 0),
  );
}
