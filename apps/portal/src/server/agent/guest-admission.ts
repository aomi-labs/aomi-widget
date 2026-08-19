import type { GuestInternalPrincipal } from "./internal-principal";

export type GuestAdmission = {
  principal: GuestInternalPrincipal;
  remainingTurns: number;
};

export function admitGuest(input: {
  sessionId: string;
  sessionExpiresAt: number;
  applicationId: bigint;
  applicationIsActive: boolean;
  applicationIsPublic: boolean;
  turnsUsed: number;
  turnLimit: number;
  now?: number;
}): GuestAdmission {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (input.sessionExpiresAt <= now) throw new Error("guest_session_expired");
  if (!input.applicationIsActive || !input.applicationIsPublic) {
    throw new Error("guest_application_forbidden");
  }
  if (input.turnsUsed >= input.turnLimit)
    throw new Error("guest_quota_exhausted");
  return {
    principal: {
      kind: "guest",
      sessionId: input.sessionId,
      applicationId: input.applicationId,
      expiresAt: input.sessionExpiresAt,
    },
    remainingTurns: input.turnLimit - input.turnsUsed - 1,
  };
}

export function redactGuestEvent(
  event: Record<string, unknown>,
): Record<string, unknown> {
  const {
    internalPrompt: _prompt,
    providerTrace: _trace,
    ...publicEvent
  } = event;
  return publicEvent;
}
