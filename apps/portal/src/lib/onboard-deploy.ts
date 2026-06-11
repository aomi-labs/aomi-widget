import "server-only";

import { resolveDeployPlatform } from "@portal/lib/deploy-platform";

type SourceRef =
  | { kind: "branch"; value: string }
  | { kind: "commit"; value: string };

type BackendRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

export type OnboardDeployEnv = {
  backendUrl: string;
  bearer: string;
  adminSecret?: string;
  activationToken?: string;
  platform: string;
  templateRepo: string;
  createdRepoPrivate: boolean;
  sourceRef: SourceRef;
  aomiTomlPaths: string[];
  targetTags: string[];
};

let cachedPlatformActivationToken: string | null = null;

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

export function readOnboardDeployEnv(): OnboardDeployEnv {
  const backendUrl = (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:8080"
  ).replace(/\/+$/, "");
  const adminSecret = process.env.AOMI_ADMIN_SECRET;
  const activationToken = process.env.APP_DEPLOY_ACTIVATION_TOKEN;
  const bearer = activationToken || adminSecret;
  if (!bearer) {
    throw new Error(
      "onboarding deploy is not configured: set AOMI_ADMIN_SECRET or APP_DEPLOY_ACTIVATION_TOKEN",
    );
  }
  const sourceRef: SourceRef = process.env.APP_DEPLOY_SOURCE_COMMIT
    ? { kind: "commit", value: process.env.APP_DEPLOY_SOURCE_COMMIT }
    : { kind: "branch", value: process.env.APP_DEPLOY_SOURCE_BRANCH || "main" };
  const aomiTomlPaths = (process.env.APP_DEPLOY_AOMI_TOML_PATHS || "aomi.toml")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  const targetTags = (process.env.APP_DEPLOY_TARGET_TAGS || "staging")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    backendUrl,
    bearer,
    adminSecret,
    activationToken,
    platform: resolveDeployPlatform(),
    templateRepo: process.env.APP_DEPLOY_TEMPLATE_REPO || "aomi-labs/playground-example",
    createdRepoPrivate: process.env.APP_DEPLOY_CREATED_REPO_PRIVATE === "true",
    sourceRef,
    aomiTomlPaths,
    targetTags,
  };
}

export async function activationEnv(
  env: OnboardDeployEnv,
): Promise<OnboardDeployEnv> {
  if (env.activationToken) return env;
  if (cachedPlatformActivationToken) {
    return { ...env, bearer: cachedPlatformActivationToken };
  }
  if (!env.adminSecret) {
    throw new Error(
      "activation requires APP_DEPLOY_ACTIVATION_TOKEN or AOMI_ADMIN_SECRET",
    );
  }
  const minted = await backendRequest<{ token?: string }>(
    { ...env, bearer: env.adminSecret },
    `/api/platforms/${encodeURIComponent(env.platform)}/tokens`,
    {
      method: "POST",
      body: { scope: "platform" },
    },
  );
  if (!minted.token) {
    throw new Error("backend did not return a platform activation token");
  }
  cachedPlatformActivationToken = minted.token;
  return { ...env, bearer: minted.token };
}

export async function backendRequest<T>(
  env: OnboardDeployEnv,
  path: string,
  opts: BackendRequestOptions = {},
): Promise<T> {
  const res = await fetch(`${env.backendUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${env.bearer}`,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
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
    // A minted platform token can be rotated/expired backend-side; drop the
    // cached one on an auth failure so the next activation re-mints instead of
    // looping on a stale token for the lifetime of the server process.
    if (res.status === 401 || res.status === 403) {
      cachedPlatformActivationToken = null;
    }
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `${opts.method ?? "GET"} ${path} failed (${res.status})`;
    throw new Error(message);
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
