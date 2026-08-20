import type { AomiClient } from "@aomi-labs/client";

/**
 * Explicit compatibility adapter for integrations that still issue the old
 * free-form system command. Canonical Agent chat, state, wallet, and action
 * flows must not call this module.
 */
export async function sendLegacySystemEvent(
  client: AomiClient,
  event: { type: string; sessionId: string; payload: unknown },
  app: string,
): Promise<void> {
  await client.sendSystemMessage(
    event.sessionId,
    JSON.stringify({ type: event.type, payload: event.payload }),
    { app },
  );
}
