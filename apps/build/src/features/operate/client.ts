"use client";

import { API_PATHS } from "@build/lib/api-paths";

export type OperateKind =
  | "bots"
  | "transactions"
  | "usage"
  | "logs"
  | "observability";

export async function operateFetch<T>(
  kind: OperateKind,
  sourceId?: number | null,
  cursor?: unknown,
  limit?: number,
): Promise<T> {
  const path = API_PATHS.bff.operate[kind];
  const params = new URLSearchParams();
  if (sourceId) params.set("appSourceId", String(sourceId));
  if (cursor) {
    params.set(
      "cursor",
      typeof cursor === "string" ? cursor : JSON.stringify(cursor),
    );
  }
  if (limit) params.set("limit", String(limit));
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
): Promise<T> {
  const res = await fetch(
    API_PATHS.bff.operate.observabilityDetail(appSourceId, applicationId),
  );
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      json.error || `observability detail failed (${res.status})`,
    );
  }
  return json;
}
