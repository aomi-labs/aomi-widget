import { describe, expect, it } from "vitest";

import { admitGuest, redactGuestEvent } from "./guest-admission";

describe("guest admission", () => {
  it("admits only active public apps and reports quota separately", () => {
    expect(
      admitGuest({
        sessionId: "sess_1234567890abcdef",
        sessionExpiresAt: 2_000,
        applicationId: 9n,
        applicationIsActive: true,
        applicationIsPublic: true,
        turnsUsed: 2,
        turnLimit: 5,
        now: 1_000,
      }),
    ).toMatchObject({ remainingTurns: 2, principal: { kind: "guest" } });
    expect(() =>
      admitGuest({
        sessionId: "sess_1234567890abcdef",
        sessionExpiresAt: 2_000,
        applicationId: 9n,
        applicationIsActive: true,
        applicationIsPublic: true,
        turnsUsed: 5,
        turnLimit: 5,
        now: 1_000,
      }),
    ).toThrow("guest_quota_exhausted");
  });

  it("rejects private apps and redacts internal event fields", () => {
    expect(() =>
      admitGuest({
        sessionId: "sess_1234567890abcdef",
        sessionExpiresAt: 2_000,
        applicationId: 9n,
        applicationIsActive: true,
        applicationIsPublic: false,
        turnsUsed: 0,
        turnLimit: 5,
        now: 1_000,
      }),
    ).toThrow("guest_application_forbidden");
    expect(
      redactGuestEvent({
        type: "tool_activity",
        internalPrompt: "secret chain of thought",
        providerTrace: { id: "trace" },
      }),
    ).toEqual({ type: "tool_activity" });
  });
});
