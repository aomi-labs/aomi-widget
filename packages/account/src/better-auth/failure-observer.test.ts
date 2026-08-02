import { afterEach, describe, expect, it, vi } from "vitest";

import {
  observeBetterAuthFailure,
  setBetterAuthFailureObserver,
} from "./failure-observer";

describe("Better Auth failure observer", () => {
  afterEach(() => setBetterAuthFailureObserver(undefined));

  it("forwards only the original error and normalized status", () => {
    const observer = vi.fn();
    const error = Object.assign(new Error("database unavailable"), {
      statusCode: 500,
      request: { headers: { cookie: "secret" } },
    });
    setBetterAuthFailureObserver(observer);

    observeBetterAuthFailure(error);

    expect(observer).toHaveBeenCalledWith({
      kind: "api_error",
      error,
      status: 500,
    });
  });

  it("does not let an observer failure alter auth behavior", () => {
    setBetterAuthFailureObserver(() => {
      throw new Error("telemetry unavailable");
    });

    expect(() =>
      observeBetterAuthFailure(new Error("auth failed")),
    ).not.toThrow();
  });

  it("absorbs async observer rejections", async () => {
    const rejection = Promise.reject(new Error("telemetry unavailable"));
    const catchSpy = vi.spyOn(rejection, "catch");
    setBetterAuthFailureObserver(() => rejection);

    observeBetterAuthFailure(new Error("auth failed"));

    expect(catchSpy).toHaveBeenCalledOnce();
    await rejection.catch(() => {});
  });
});
