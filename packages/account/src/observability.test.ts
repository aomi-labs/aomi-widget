import { afterEach, describe, expect, it, vi } from "vitest";

import {
  observeAccountDiagnostic,
  observeAccountInternalFailure,
  setAccountDiagnosticObserver,
  setAccountInternalFailureObserver,
} from "./observability";

describe("account observers", () => {
  afterEach(() => {
    setAccountDiagnosticObserver(undefined);
    setAccountInternalFailureObserver(undefined);
  });

  it("forwards expected diagnostics without changing their shape", () => {
    const observer = vi.fn();
    const diagnostic = {
      kind: "provider.credential_rejected",
      attributes: { provider: "para", subject_present: true },
      context: {
        routeFamily: "/api/auth/[...all]",
        operation: "account.provider_exchange",
        method: "POST",
      },
      response: { status: 400, error: "invalid_provider_credential" },
    } as const;
    setAccountDiagnosticObserver(observer);

    observeAccountDiagnostic(diagnostic);

    expect(observer).toHaveBeenCalledWith(diagnostic);
  });

  it("does not let observers alter account behavior", () => {
    setAccountInternalFailureObserver(() => {
      throw new Error("failure observer unavailable");
    });
    setAccountDiagnosticObserver(() => {
      throw new Error("diagnostic observer unavailable");
    });

    expect(() =>
      observeAccountInternalFailure({
        kind: "provider_wallets",
        error: new Error("provider unavailable"),
      }),
    ).not.toThrow();
    expect(() =>
      observeAccountDiagnostic({
        kind: "provider.credential_rejected",
        context: {
          routeFamily: "/api/auth/[...all]",
          operation: "account.provider_exchange",
        },
        response: { status: 400, error: "invalid_provider_credential" },
      }),
    ).not.toThrow();
  });

  it("absorbs async observer rejections", async () => {
    const rejection = Promise.reject(new Error("telemetry unavailable"));
    const catchSpy = vi.spyOn(rejection, "catch");
    setAccountInternalFailureObserver(() => rejection);

    observeAccountInternalFailure({
      kind: "provider_wallets",
      error: new Error("provider unavailable"),
    });

    expect(catchSpy).toHaveBeenCalledOnce();
    await rejection.catch(() => {});
  });

  it("uses the most recently registered observer", () => {
    const first = vi.fn();
    const second = vi.fn();
    setAccountInternalFailureObserver(first);
    setAccountInternalFailureObserver(second);

    observeAccountInternalFailure({
      kind: "provider_wallets",
      error: new Error("provider unavailable"),
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
