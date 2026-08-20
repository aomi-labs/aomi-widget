import type { AomiClient } from "../client";

/** Explicit compatibility boundary for CLI records created before Agent v1. */
export function fetchLegacyAgentState(
  client: AomiClient,
  sessionId: string,
  clientId?: string,
) {
  return client.fetchState(sessionId, undefined, clientId);
}

/** Explicit compatibility boundary for old free-form wallet callbacks. */
export function sendLegacyAgentSystemMessage(
  client: AomiClient,
  sessionId: string,
  message: string,
  app?: string,
) {
  return client.sendSystemMessage(sessionId, message, { app });
}
