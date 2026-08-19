import "server-only";

import { getPool } from "@aomi-labs/account";

import {
  decodeApplicationId,
  encodeApplicationId,
  type PublicApplicationId,
} from "./application-id";

export type DiscoveredApplication = {
  id: PublicApplicationId;
  internalId: bigint;
  name: string;
  label: string;
  platform: string;
  activeRelease: string | null;
  capabilities: Array<
    "agent" | "evm" | "svm" | "externalSigning" | "hostedExecution"
  >;
  isPublic: boolean;
};

type ApplicationRow = {
  id: string;
  name: string;
  label: string;
  is_public: boolean;
  app_release_tag: string | null;
  platform: string | null;
  metadata: unknown;
};

export async function listApplications(input: {
  includePrivate: boolean;
}): Promise<DiscoveredApplication[]> {
  const result = await getPool().query<ApplicationRow>(
    `select a.id::text, a.name, a.label, a.is_public, a.app_release_tag,
            p.name as platform, a.metadata
       from applications a
       left join platforms p on p.id = a.platform_id
      where a.is_active = true
        and ($1::boolean or a.is_public = true)
      order by a.name, a.id`,
    [input.includePrivate],
  );
  return result.rows.map(projectApplication);
}

export async function resolveApplication(
  selector: string | undefined,
  input: { includePrivate: boolean },
): Promise<DiscoveredApplication> {
  const normalized = selector?.trim() || "default";
  const apps = await listApplications(input);
  if (normalized.startsWith("app_")) {
    const id = decodeApplicationId(normalized);
    const found = apps.find((app) => app.internalId === id);
    if (!found) throw new Error("application_not_found");
    return found;
  }
  const matches = apps.filter((app) => app.name === normalized.toLowerCase());
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? "application_not_found"
        : "ambiguous_application_alias",
    );
  }
  return matches[0];
}

function projectApplication(row: ApplicationRow): DiscoveredApplication {
  const internalId = BigInt(row.id);
  const metadata = record(row.metadata);
  const configured = Array.isArray(metadata?.capabilities)
    ? metadata.capabilities.filter(isCapability)
    : [];
  const capabilities = [
    "agent" as const,
    "externalSigning" as const,
    ...configured,
  ].filter((value, index, values) => values.indexOf(value) === index);
  return {
    id: encodeApplicationId(internalId),
    internalId,
    name: row.name,
    label: row.label,
    platform: row.platform ?? "community",
    activeRelease: row.app_release_tag,
    capabilities,
    isPublic: row.is_public,
  };
}

function isCapability(
  value: unknown,
): value is DiscoveredApplication["capabilities"][number] {
  return (
    value === "agent" ||
    value === "evm" ||
    value === "svm" ||
    value === "externalSigning" ||
    value === "hostedExecution"
  );
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
