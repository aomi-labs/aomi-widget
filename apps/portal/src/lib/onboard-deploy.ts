import "server-only";

import { NextResponse } from "next/server";
import { portalService } from "@aomi-labs/account";
import {
  BackendError,
  DeployError,
  DeploymentClient,
  type DeployPayload,
  type SourceRef,
} from "@aomi-labs/deploy";
import { configuredBackendUrl } from "@portal/lib/backend-url";
import { resolveDeployPlatform } from "@portal/lib/deploy-platform";

// Onboarding deploy/activate is one fixed shape: deploy `main` of the source
// repo's `aomi.toml` to the configured platform. The portal owns these defaults;
// the wire/contract details live in the shared @aomi-labs/deploy client.
const ONBOARD_TEMPLATE_REPO = "aomi-labs/playground-example";
const ONBOARD_CREATED_REPO_PRIVATE = false;
const ONBOARD_SOURCE_REF: SourceRef = { kind: "branch", value: "main" };
const ONBOARD_AOMI_TOML_PATHS = ["aomi.toml"];
const ONBOARD_TARGET_TAGS: string[] = [];

export type OnboardConfig = {
  platform: string;
  templateRepo: string;
  createdRepoPrivate: boolean;
  sourceRef: SourceRef;
  aomiTomlPaths: string[];
  targetTags: string[];
};

/** Static onboarding deploy parameters (no I/O). */
export function onboardConfig(): OnboardConfig {
  return {
    platform: resolveDeployPlatform(),
    templateRepo: ONBOARD_TEMPLATE_REPO,
    createdRepoPrivate: ONBOARD_CREATED_REPO_PRIVATE,
    sourceRef: { ...ONBOARD_SOURCE_REF },
    aomiTomlPaths: [...ONBOARD_AOMI_TOML_PATHS],
    targetTags: [...ONBOARD_TARGET_TAGS],
  };
}

// The portal authenticates to the backend as a **service** principal: it mints a
// short-lived `service`-role AccountBearer via its `AomiService` (identity/kid/
// roles from `service.portal.toml`, key from env). It is NOT an admin — admin is
// a human, and `/api/admin/*` is out of the portal's scope.
async function mintServiceBearer(): Promise<string> {
  const { accessToken } = await portalService().mint({
    role: "service",
    subject: "aomi-bff",
    audience: "aomi-backend",
  });
  return accessToken;
}

/**
 * A `DeploymentClient` authenticated as the portal's service principal. This is
 * the single seam to the backend deploy contract — every onboarding route goes
 * through it instead of hand-rolling fetches.
 */
export async function getDeploymentClient(): Promise<DeploymentClient> {
  const activationToken = await mintServiceBearer();
  return new DeploymentClient({
    aomi: { backendUrl: configuredBackendUrl(), activationToken },
  });
}

/** Resolve the connected source row to its `app_source_id` for a deploy. */
export async function resolveAppSourceId(args: {
  client: DeploymentClient;
  platform: string;
  installationId: string;
  repo?: string;
}): Promise<number> {
  const source = await args.client.resolveSource({
    platform: args.platform,
    installationId: Number(args.installationId),
    repo: args.repo,
  });
  if (!Number.isSafeInteger(source.id) || source.id <= 0) {
    throw new Error("backend did not return a valid app source id");
  }
  return source.id;
}

// `DeploymentClient` returns camelCase; deployment payloads here are read with a
// snake/camel fallback so both shapes (and the raw `.aomi/deployment.json`) work.
type AppsLike = { platform?: { apps?: Array<Record<string, unknown>> } };

export function releaseTagsFromDeployment(
  deployment?: DeployPayload | AppsLike,
): string[] {
  const apps = (deployment as AppsLike | undefined)?.platform?.apps ?? [];
  return apps
    .map((app) => (app.release_tag ?? app.releaseTag) as string | undefined)
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag));
}

export function appNamesFromDeployment(
  deployment?: DeployPayload | AppsLike,
): string[] {
  const apps = (deployment as AppsLike | undefined)?.platform?.apps ?? [];
  return apps
    .map((app) => (app.name as string | undefined)?.trim())
    .filter((name): name is string => Boolean(name));
}

/** Extract the backend's `{ error }` message from a `BackendError` body. */
function backendErrorMessage(body?: string): string | null {
  if (!body) return null;
  try {
    const json = JSON.parse(body) as { error?: unknown };
    return typeof json.error === "string" ? json.error : null;
  } catch {
    return null;
  }
}

/** Pull the first per-app error out of an activation `DeployError.reason`. */
function activationErrorMessage(err: unknown): string | null {
  if (!(err instanceof DeployError)) return null;
  const reason = err.reason;
  if (Array.isArray(reason)) {
    const first = reason.find(
      (r): r is { app?: string; error?: string } =>
        typeof r === "object" && r !== null && "error" in r,
    );
    if (first?.error) return first.error;
  }
  return null;
}

/** Map a thrown deploy/backend error to a portal JSON error response. */
export function onboardErrorResponse(err: unknown): NextResponse {
  let status = 502;
  let message = err instanceof Error ? err.message : String(err);
  if (err instanceof BackendError) {
    if (err.status >= 400 && err.status < 600) status = err.status;
    message = backendErrorMessage(err.body) ?? activationErrorMessage(err) ?? message;
  } else if (err instanceof DeployError) {
    if (err.code === "INVALID_REQUEST") status = 400;
    message = activationErrorMessage(err) ?? message;
  }
  return NextResponse.json({ error: message }, { status });
}

export { BackendError, DeployError } from "@aomi-labs/deploy";
