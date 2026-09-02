import { afterEach, describe, expect, it, vi } from "vitest";
import { setAccountInternalFailureObserver } from "../observability";
import { checkWidgetAuthRateLimit } from "./rate-limit";

describe("shared widget auth rate limit", () => {
  afterEach(() => {
    setAccountInternalFailureObserver(undefined);
    vi.restoreAllMocks();
  });

  it("persists only a digest and uses the fixed window expiry", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [{ allowed: true }] }),
    };
    vi.spyOn(Math, "random").mockReturnValue(1);

    await expect(
      checkWidgetAuthRateLimit({
        origin: "https://partner.example",
        clientAddress: "203.0.113.8",
        now: new Date("2026-09-02T12:00:30.000Z"),
        db: db as never,
      }),
    ).resolves.toEqual({ allowed: true });

    const parameters = db.query.mock.calls[0]?.[1] as unknown[];
    expect(parameters[0]).toMatch(/^aomi:widget:rate:[a-f0-9]{64}$/);
    expect(JSON.stringify(parameters)).not.toContain("partner.example");
    expect(JSON.stringify(parameters)).not.toContain("203.0.113.8");
    expect(parameters[3]).toEqual(new Date("2026-09-02T12:01:00.000Z"));
  });

  it("fails closed when storage returns no counter result", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    vi.spyOn(Math, "random").mockReturnValue(1);
    await expect(
      checkWidgetAuthRateLimit({
        origin: "https://partner.example",
        clientAddress: "203.0.113.8",
        db: db as never,
      }),
    ).resolves.toEqual({ allowed: false });
  });

  it("uses a fresh counter identifier after the fixed window expires", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [{ allowed: true }] }),
    };
    vi.spyOn(Math, "random").mockReturnValue(1);
    const base = {
      origin: "https://partner.example",
      clientAddress: "203.0.113.8",
      db: db as never,
    };

    await checkWidgetAuthRateLimit({
      ...base,
      now: new Date("2026-09-02T12:00:59.999Z"),
    });
    await checkWidgetAuthRateLimit({
      ...base,
      now: new Date("2026-09-02T12:01:00.000Z"),
    });

    expect(db.query.mock.calls[0]?.[1]?.[0]).not.toBe(
      db.query.mock.calls[1]?.[1]?.[0],
    );
  });

  it("observes but does not surface expiry cleanup failures", async () => {
    const failure = new Error("cleanup failed");
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ allowed: true }] })
        .mockRejectedValueOnce(failure),
    };
    const observer = vi.fn();
    setAccountInternalFailureObserver(observer);
    vi.spyOn(Math, "random").mockReturnValue(0);

    await expect(
      checkWidgetAuthRateLimit({
        origin: "https://partner.example",
        clientAddress: "203.0.113.8",
        db: db as never,
      }),
    ).resolves.toEqual({ allowed: true });
    expect(observer).toHaveBeenCalledWith({
      kind: "widget_rate_limit_sweep",
      error: failure,
    });
  });
});
