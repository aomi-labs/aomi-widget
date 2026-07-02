// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BackendError, DeployError } from "@aomi-labs/deploy";

import { asCliError } from "../../src/cli/commands/deploy-shared";
import { DeployCliError } from "../../src/cli/errors";

function cli(err: unknown): DeployCliError {
  const mapped = asCliError(err);
  expect(mapped).toBeInstanceOf(DeployCliError);
  return mapped as DeployCliError;
}

describe("asCliError — @aomi-labs/deploy → DeployCliError", () => {
  it("maps a network failure (status 0) to NETWORK_ERROR", () => {
    const mapped = cli(new BackendError("deploy", 0, "deploy request failed"));
    expect(mapped.errorCode).toBe("NETWORK_ERROR");
    expect(mapped.message).toBe(
      "Cannot reach Aomi backend; check your connection",
    );
  });

  it.each([401, 403])("maps HTTP %d to AUTH_FAILED", (status) => {
    const mapped = cli(
      new BackendError("deploy", status, `deploy failed (${status})`),
    );
    expect(mapped.errorCode).toBe("AUTH_FAILED");
    expect(mapped.message).toBe("Session expired; run `aomi account login`");
  });

  it("prefers the backend's error field from the response body", () => {
    const mapped = cli(
      new BackendError(
        "deploy",
        500,
        "deploy failed (500)",
        JSON.stringify({ error: "boom" }),
      ),
    );
    expect(mapped.errorCode).toBe("BACKEND_ERROR");
    expect(mapped.message).toBe("boom");
  });

  it("falls back to the backend's reason field", () => {
    const mapped = cli(
      new BackendError(
        "deploy",
        422,
        "deploy failed (422)",
        JSON.stringify({ reason: "bad manifest" }),
      ),
    );
    expect(mapped.errorCode).toBe("BACKEND_ERROR");
    expect(mapped.message).toBe("bad manifest");
  });

  it("uses the package message when the body is not JSON", () => {
    const mapped = cli(
      new BackendError("status", 502, "status failed (502)", "<html>"),
    );
    expect(mapped.errorCode).toBe("BACKEND_ERROR");
    expect(mapped.message).toBe("status failed (502)");
  });

  it("maps client-side validation to VALIDATION_ERROR", () => {
    const mapped = cli(
      new DeployError("INVALID_REQUEST", "platform is required"),
    );
    expect(mapped.errorCode).toBe("VALIDATION_ERROR");
    expect(mapped.message).toBe("platform is required");
  });

  it("maps other package errors to BACKEND_ERROR", () => {
    const mapped = cli(
      new DeployError("BACKEND", "deploy rejected by backend"),
    );
    expect(mapped.errorCode).toBe("BACKEND_ERROR");
    expect(mapped.message).toBe("deploy rejected by backend");
  });

  it("passes non-package errors through unchanged", () => {
    const original = new Error("unrelated");
    expect(asCliError(original)).toBe(original);
  });
});
