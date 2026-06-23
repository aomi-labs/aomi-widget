import "server-only";

import { portalService } from "@aomi-labs/account";
import { configuredBackendUrl } from "@portal/lib/backend-url";
import { resolveDeployPlatform } from "@portal/lib/deploy-platform";

const ONBOARD_TEMPLATE_REPO = "aomi-labs/playground-example";
const ONBOARD_CREATED_REPO_PRIVATE = false;
const ONBOARD_SOURCE_REF: SourceRef = { kind: "branch", value: "main" };
const ONBOARD_AOMI_TOML_PATHS = ["aomi.toml"];
const ONBOARD_TARGET_TAGS: string[] = [];

// The portal authenticates to the backend as a **service** principal: it mints a
// short-lived `service`-role AccountBearer via its `AomiService` (the topology
// lib — identity/kid/roles from `service.portal.toml`, key from env). It is NOT
// an admin — admin is a human, and `/api/admin/*` is out of the portal's scope.
async function mintServiceBearer(): Promise<string> {
  const { accessToken } = await portalService().mint({
    role: "service",
    subject: "aomi-bff",
    audience: "aomi-backend",
  });
  return accessToken;
}

type SourceRef =
  | { kind: "branch"; value: string }
  | { kind: "commit"; value: string };

type BackendRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

export class BackendRequestError extends Error {
  readonly status: number;
  readonly path: string;
  readonly body: string;

  constructor(args: {
    message: string;
    status: number;
    path: string;
    body: string;
  }) {
    super(args.message);
    this.name = "BackendRequestError";
    this.status = args.status;
    this.path = args.path;
    this.body = args.body;
  }
}

export type OnboardDeployEnv = {
  backendUrl: string;
  bearer: string;
  platform: string;
  templateRepo: string;
  createdRepoPrivate: boolean;
  sourceRef: SourceRef;
  aomiTomlPaths: string[];
  targetTags: string[];
};

export type BackendDeployPayload = {
  id: string;
  source?: { repository_link?: string };
  platform?: {
    apps?: Array<{
      name?: string;
      release_tag?: string;
      releaseTag?: string;
    }>;
  };
};

export type BackendDeployResult = {
  deployment: BackendDeployPayload;
};

export type BackendAppSourceResult = {
  source?: {
    id?: number;
    installation_id?: number;
    repository_id?: number;
    repository_link?: string;
  };
};

export type BackendActivationResult = {
  ok?: boolean;
  activation?: unknown;
};

export type BackendAppStatusResult = {
  app?: {
    name?: string;
    is_active?: boolean;
    loaded?: boolean;
    app_release_tag?: string | null;
  };
};

export type BackendDeploymentStatusResult = {
  deployment?: BackendDeployPayload;
  state?: string;
  releaseTags?: string[];
  apps?: unknown[];
  ci?: unknown;
  message?: string;
};

export async function readOnboardDeployEnv(): Promise<OnboardDeployEnv> {
  const bearer = await mintServiceBearer();
  return {
    backendUrl: configuredBackendUrl(),
    bearer,
    platform: resolveDeployPlatform(),
    templateRepo: ONBOARD_TEMPLATE_REPO,
    createdRepoPrivate: ONBOARD_CREATED_REPO_PRIVATE,
    sourceRef: ONBOARD_SOURCE_REF,
    aomiTomlPaths: [...ONBOARD_AOMI_TOML_PATHS],
    targetTags: [...ONBOARD_TARGET_TAGS],
  };
}

export async function backendRequest<T>(
  env: OnboardDeployEnv,
  path: string,
  opts: BackendRequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${env.backendUrl}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${env.bearer}`,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new BackendRequestError({
        message: "Request to backend timed out after 30 seconds",
        status: 504,
        path,
        body: "",
      });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  const text = await res.text();
  let json: unknown = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `${opts.method ?? "GET"} ${path} failed (${res.status})`;
    throw new BackendRequestError({
      message,
      status: res.status,
      path,
      body: text,
    });
  }
  return json as T;
}

export function deployRequestBody(
  env: OnboardDeployEnv,
  appSourceId: number,
  dryRun: boolean,
) {
  return {
    app_source_id: appSourceId,
    source_ref: env.sourceRef,
    aomi_toml_paths: env.aomiTomlPaths,
    dry_run: dryRun,
  };
}

export async function resolveAppSourceId(args: {
  env: OnboardDeployEnv;
  installationId: string;
  repo?: string;
}): Promise<number> {
  const params = new URLSearchParams({
    installation_id: args.installationId,
  });
  if (args.repo) params.set("repo", args.repo);
  const result = await backendRequest<{
    source?: { id?: number; repository_link?: string };
  }>(
    args.env,
    `/api/platforms/${encodeURIComponent(args.env.platform)}/sources/resolve?${params}`,
  );
  const id = result.source?.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new Error("backend did not return a valid app source id");
  }
  return id;
}

export function appNamesFromDeployment(deployment?: {
  platform?: { apps?: Array<{ name?: string }> };
}): string[] {
  return (deployment?.platform?.apps ?? [])
    .map((app) => app.name?.trim())
    .filter((name): name is string => Boolean(name));
}

export function releaseTagsFromDeployment(deployment?: {
  platform?: { apps?: Array<{ release_tag?: string; releaseTag?: string }> };
}): string[] {
  return (deployment?.platform?.apps ?? [])
    .map((app) => app.release_tag ?? app.releaseTag)
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag));
}
