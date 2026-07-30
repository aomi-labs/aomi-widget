import { describe, expect, it } from "vitest";

import { BackendError, DeployError } from "../src/errors";
import { identifyLaunchError, launchErrorResponse } from "../src/bff/index";
import { RequiredSecretsCheckError } from "../src/bff/release-manifest";

describe("launch error responses", () => {
  it.each([401, 403, 503])(
    "preserves a backend %s response while exposing classification facts",
    async (status) => {
      const error = new BackendError(
        "deploy",
        status,
        `deploy failed (${status})`,
        JSON.stringify({ error: `backend_${status}` }),
      );

      expect(identifyLaunchError(error)).toMatchObject({
        origin: "upstream_response",
        upstream: "rust",
        upstreamStatus: status,
        credential: "service",
        response: { status, error: `backend_${status}` },
      });
      const response = launchErrorResponse(error);
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({
        error: `backend_${status}`,
      });
    },
  );

  it("preserves invalid-request and required-secret user messages", async () => {
    const invalid = launchErrorResponse(
      new DeployError("INVALID_REQUEST", "invalid release"),
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({
      error: "invalid release",
    });

    const unavailable = launchErrorResponse(new RequiredSecretsCheckError());
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toEqual({
      error: "Unable to verify required secrets. Try again.",
    });
  });

  it("preserves the established unknown-error fallback", async () => {
    const error = new Error("launch setup failed");

    expect(identifyLaunchError(error)).toMatchObject({
      origin: "local",
      response: { status: 502, error: "launch setup failed" },
    });
    const response = launchErrorResponse(error);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "launch setup failed",
    });
  });
});
