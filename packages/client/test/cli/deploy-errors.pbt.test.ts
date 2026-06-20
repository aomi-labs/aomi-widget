import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { DeployCliError, CliExit, fatal } from "../../src/cli/errors";
import { statusCommand } from "../../src/cli/commands/status";

describe("DeployCliError — property-based", () => {
  const validCodes = [
    "AUTH_FAILED",
    "BACKEND_ERROR",
    "NOT_A_GIT_REPO",
    "VALIDATION_ERROR",
    "NETWORK_ERROR",
  ] as const;

  it("always has name 'DeployCliError' and stores errorCode", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validCodes),
        fc.string({ minLength: 1, maxLength: 200 }),
        (code, message) => {
          const err = new DeployCliError(code, message);
          expect(err.name).toBe("DeployCliError");
          expect(err.errorCode).toBe(code);
          expect(err.message).toBe(message);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("is an instance of Error", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validCodes),
        fc.string({ minLength: 1 }),
        (code, message) => {
          const err = new DeployCliError(code, message);
          expect(err).toBeInstanceOf(Error);
          expect(err).toBeInstanceOf(DeployCliError);
        },
      ),
      { numRuns: 20 },
    );
  });
});

describe("CliExit — property-based", () => {
  it("stores the exit code", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 255 }), (code) => {
        const err = new CliExit(code);
        expect(err.code).toBe(code);
      }),
      { numRuns: 50 },
    );
  });
});

describe("fatal — property-based", () => {
  it("throws a CliExit with code 1", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (message) => {
          expect(() => fatal(message)).toThrow(CliExit);
          try {
            fatal(message);
          } catch (err) {
            expect((err as CliExit).code).toBe(1);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});

describe("CLI error code mapping — Properties 13-14", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Property 13: AUTH_FAILED for HTTP 401 and 403", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(401, 403), async (status) => {
        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue(
            new Response(`{"error":"unauthorized"}`, {
              status,
              headers: { "Content-Type": "application/json" },
            }),
          ),
        );

        await expect(
          statusCommand({
            "deployment-id": "dep_test",
            "activation-token": "test-token",
            "backend-url": "https://api.aomi.dev",
            platform: "community",
          }),
        ).rejects.toMatchObject({
          name: "DeployCliError",
          errorCode: "AUTH_FAILED",
        });
      }),
      { numRuns: 5 },
    );
  });

  it("Property 13: NOT AUTH_FAILED for non-401/403 HTTP statuses", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }).filter((s) => s !== 401 && s !== 403),
        async (status) => {
          vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
              new Response(`{"error":"error"}`, {
                status,
                headers: { "Content-Type": "application/json" },
              }),
            ),
          );

          try {
            await statusCommand({
              "deployment-id": "dep_test",
              "activation-token": "test-token",
              "backend-url": "https://api.aomi.dev",
              platform: "community",
            });
          } catch (err) {
            expect(err).toBeInstanceOf(DeployCliError);
            expect((err as DeployCliError).errorCode).not.toBe("AUTH_FAILED");
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("Property 14: NETWORK_ERROR for connection failures", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "fetch failed"),
        async (errorMsg) => {
          vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error(errorMsg)),
          );

          await expect(
            statusCommand({
              "deployment-id": "dep_test",
              "activation-token": "test-token",
              "backend-url": "https://api.aomi.dev",
              platform: "community",
            }),
          ).rejects.toMatchObject({
            name: "DeployCliError",
            errorCode: "NETWORK_ERROR",
          });
        },
      ),
      { numRuns: 5 },
    );
  });
});
