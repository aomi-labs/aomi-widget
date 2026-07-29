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
  const res = await fetch(`${path}${params.size ? `?${params}` : ""}`);
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `${kind} failed (${res.status})`);
  }
  return json;
}

export async function operateAppDetailFetch<T>(
  appSourceId: number,
  applicationId: number,
  platform?: string | null,
): Promise<T> {
  const res = await fetch(
    API_PATHS.bff.operate.observabilityDetail(
      appSourceId,
      applicationId,
      platform,
    ),
  );
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      json.error || `observability detail failed (${res.status})`,
    );
  }
  return json;
}

export async function modelKeysFetch<T>(): Promise<T> {
  const res = await fetch(API_PATHS.bff.operate.modelKeys);
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `model keys failed (${res.status})`);
  }
  return json;
}
