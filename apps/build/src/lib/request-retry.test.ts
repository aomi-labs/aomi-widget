import { describe, expect, it } from "vitest";

import {
  controlPlaneRetryDelay,
  HttpRequestError,
  parseRetryAfter,
  shouldRetryControlPlaneQuery,
} from "./request-retry";

describe("control-plane retry policy", () => {
  it("retries one network or gateway failure", () => {
    expect(shouldRetryControlPlaneQuery(0, new TypeError("offline"))).toBe(
      true,
    );
    expect(
      shouldRetryControlPlaneQuery(
        0,
        new HttpRequestError("unavailable", { status: 503 }),
      ),
    ).toBe(true);
    expect(
      shouldRetryControlPlaneQuery(
        1,
        new HttpRequestError("unavailable", { status: 503 }),
      ),
    ).toBe(false);
  });

  it("does not retry deterministic responses or explicit timeouts", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 500]) {
      expect(
        shouldRetryControlPlaneQuery(
          0,
          new HttpRequestError("failed", { status }),
        ),
      ).toBe(false);
    }
    expect(
      shouldRetryControlPlaneQuery(
        0,
        new HttpRequestError("timed out", { retryable: false }),
      ),
    ).toBe(false);
  });

  it("honors only short, server-directed 429 retries", () => {
    expect(
      shouldRetryControlPlaneQuery(
        0,
        new HttpRequestError("slow down", {
          status: 429,
          retryAfterMs: 2_000,
        }),
      ),
    ).toBe(true);
    expect(
      shouldRetryControlPlaneQuery(
        0,
        new HttpRequestError("slow down", { status: 429 }),
      ),
    ).toBe(false);
    expect(
      shouldRetryControlPlaneQuery(
        0,
        new HttpRequestError("slow down", {
          status: 429,
          retryAfterMs: 30_000,
        }),
      ),
    ).toBe(false);
  });

  it("parses Retry-After and uses it as the delay", () => {
    expect(parseRetryAfter("2")).toBe(2_000);
    const retryDate = "Mon, 03 Aug 2026 20:00:03 GMT";
    expect(parseRetryAfter(retryDate, Date.parse(retryDate) - 3_000)).toBe(
      3_000,
    );
    expect(parseRetryAfter("not-a-date")).toBeNull();
    expect(
      controlPlaneRetryDelay(
        0,
        new HttpRequestError("slow down", { retryAfterMs: 2_000 }),
      ),
    ).toBe(2_000);
    expect(controlPlaneRetryDelay(0, new Error("offline"))).toBe(500);
  });
});
