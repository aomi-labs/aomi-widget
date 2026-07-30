import { afterEach, describe, expect, it, vi } from "vitest";

import { setAccountInternalFailureObserver } from "../observability";
import { writeWidgetAuthTicket } from "./store";

describe("widget auth ticket cleanup", () => {
  afterEach(() => {
    setAccountInternalFailureObserver(undefined);
    vi.restoreAllMocks();
  });

  it("observes a best-effort expired-ticket sweep failure", async () => {
    const failure = new Error("cleanup failed");
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockRejectedValueOnce(failure),
    };
    const observer = vi.fn();
    setAccountInternalFailureObserver(observer);
    vi.spyOn(Math, "random").mockReturnValue(0);

    await writeWidgetAuthTicket({
      identifier: "aomi:widget:test",
      ticket: {
        kind: "siwe_challenge",
        origin: "https://portal.aomi.dev",
        address: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        issuedAt: "2026-07-29T00:00:00.000Z",
        expiresAt: "2026-07-29T00:05:00.000Z",
      },
      expiresAt: new Date("2026-07-29T00:05:00.000Z"),
      db: db as never,
    });

    expect(observer).toHaveBeenCalledWith({
      kind: "widget_ticket_sweep",
      error: failure,
    });
  });
});
