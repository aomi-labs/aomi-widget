import { afterEach, describe, expect, it, vi } from "vitest";
import { setAccountInternalFailureObserver } from "../observability";
import { checkWidgetAuthRateLimit } from "./rate-limit";

describe("shared widget auth rate limit", () => {
  afterEach(() => {
    setAccountInternalFailureObserver(undefined);
    vi.restoreAllMocks();
  });

  it("persists only a digest and uses the fixed window expiry", async () => {
    const client = mockClient([{ allowed: true }]);
    const db = mockPool(client);
    vi.spyOn(Math, "random").mockReturnValue(1);

    await expect(
      checkWidgetAuthRateLimit({
        origin: "https://partner.example",
        clientAddress: "203.0.113.8",
        now: new Date("2026-09-02T12:00:30.000Z"),
        db: db as never,
      }),
    ).resolves.toEqual({ allowed: true });

    expect(client.query.mock.calls.map(([statement]) => statement)).toEqual([
      "begin isolation level read committed",
      "select pg_advisory_xact_lock(hashtextextended($1, 0))",
      expect.stringContaining("with current_count as materialized"),
      "commit",
    ]);
    const parameters = client.query.mock.calls[2]?.[1] as unknown[];
    expect(parameters[0]).toMatch(/^aomi:widget:rate:[a-f0-9]{64}$/);
    expect(JSON.stringify(parameters)).not.toContain("partner.example");
    expect(JSON.stringify(parameters)).not.toContain("203.0.113.8");
    expect(parameters[3]).toEqual(new Date("2026-09-02T12:01:00.000Z"));
  });

  it("fails closed when storage returns no counter result", async () => {
    const client = mockClient([]);
    const db = mockPool(client);
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
    const client = mockClient([{ allowed: true }]);
    const db = mockPool(client);
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

    expect(client.query.mock.calls[2]?.[1]?.[0]).not.toBe(
      client.query.mock.calls[6]?.[1]?.[0],
    );
  });

  it("observes but does not surface expiry cleanup failures", async () => {
    const failure = new Error("cleanup failed");
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ allowed: true }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(failure),
      release: vi.fn(),
    };
    const db = mockPool(client);
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

  it("rolls back and releases the checked-out client after a counter failure", async () => {
    const failure = new Error("counter failed");
    const client = mockClient([{ allowed: true }]);
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ rows: [] });
    const db = mockPool(client);
    vi.spyOn(Math, "random").mockReturnValue(1);

    await expect(
      checkWidgetAuthRateLimit({
        origin: "https://partner.example",
        clientAddress: "203.0.113.8",
        db: db as never,
      }),
    ).rejects.toBe(failure);
    expect(client.query.mock.calls.map(([statement]) => statement)).toEqual([
      "begin isolation level read committed",
      "select pg_advisory_xact_lock(hashtextextended($1, 0))",
      expect.stringContaining("with current_count as materialized"),
      "rollback",
    ]);
    expect(client.release).toHaveBeenCalledOnce();
  });
});

function mockClient(rows: unknown[]) {
  return {
    query: vi.fn(async (statement: string, _parameters?: unknown[]) => ({
      rows: statement.includes("with current_count as materialized")
        ? rows
        : [],
    })),
    release: vi.fn(),
  };
}

function mockPool(client: ReturnType<typeof mockClient>) {
  return { connect: vi.fn().mockResolvedValue(client) };
}
