"use client";

import { API_PATHS } from "@build/lib/api-paths";

export type OperateKind =
  | "bots"
  | "transactions"
  | "usage"
  | "logs"
  | "observability";

export type OperateFetchOptions = {
  sourceId?: number | null;
  cursor?: unknown;
  limit?: number;
  platform?: string | null;
};

// Operate reads fan out across every source on the server, so a degraded
// backend used to leave the view on "Loading" until the platform's function
// timeout. Give up first and surface a real error the user can act on.
const OPERATE_FETCH_TIMEOUT_MS = 25_000;

async function operateJson<T>(url: string, label: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(OPERATE_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(
        `${label} timed out after ${OPERATE_FETCH_TIMEOUT_MS / 1000}s — the backend is slow or unavailable. Try a single source instead of All sources.`,
      );
    }
    throw err;
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `${label} failed (${res.status})`);
  }
  return json;
}

export async function operateFetch<T>(
  kind: OperateKind,
  options: OperateFetchOptions = {},
): Promise<T> {
  const path = API_PATHS.bff.operate[kind];
  const params = new URLSearchParams();
  if (options.sourceId) {
    params.set("appSourceId", String(options.sourceId));
  }
  if (options.platform?.trim()) {
    params.set("platform", options.platform.trim());
  }
  if (options.cursor) {
    params.set(
      "cursor",
      typeof options.cursor === "string"
        ? options.cursor
        : JSON.stringify(options.cursor),
    );
  }
  if (options.limit) params.set("limit", String(options.limit));
  return operateJson<T>(`${path}${params.size ? `?${params}` : ""}`, kind);
}

export async function operateAppDetailFetch<T>(
  appSourceId: number,
  applicationId: number,
  platform?: string | null,
): Promise<T> {
  return operateJson<T>(
    API_PATHS.bff.operate.observabilityDetail(
      appSourceId,
      applicationId,
      platform,
    ),
    "observability detail",
  );
}

export async function modelKeysFetch<T>(): Promise<T> {
  return operateJson<T>(API_PATHS.bff.operate.modelKeys, "model keys");
}
