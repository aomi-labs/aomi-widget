"use client";

import { API_PATHS } from "@build/lib/api-paths";
import type { IntegrationProviderId } from "./providers";

export type IntegrationStatus = {
  provider: IntegrationProviderId;
  connected: boolean;
};

export type IntegrationStatusResult = { statuses: IntegrationStatus[] };

export async function fetchIntegrationStatuses(): Promise<IntegrationStatusResult> {
  const res = await fetch(API_PATHS.bff.integrations.base);
  const json = (await res.json().catch(() => ({}))) as IntegrationStatusResult & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error || `integrations failed (${res.status})`);
  }
  return json;
}

export async function connectIntegration(input: {
  provider: IntegrationProviderId;
  values: Record<string, string>;
}): Promise<void> {
  const res = await fetch(API_PATHS.bff.integrations.base, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `save failed (${res.status})`);
  }
}
