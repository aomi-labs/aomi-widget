import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("CLI control-client auth precedence", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-context-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("uses explicit base URL, then persisted base URL, without sending persisted credentials cross-origin", async () => {
    vi.stubGlobal("location", undefined);
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/auth/sign-in/anonymous") {
          return Response.json({ token: "new-origin-guest" });
        }
        if (url.pathname === "/v1/pipeline/apps") {
          return Response.json({
            kind: "directory",
            path: "/v1/pipeline/apps",
            entries: [],
            observedAuthorization: new Headers(init?.headers).get(
              "authorization",
            ),
          });
        }
        return new Response(null, { status: 404 });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const { CliSession } = await import("../../src/cli/cli-session");
    const { createControlClient } = await import("../../src/cli/context");
    CliSession.create({
      baseUrl: "https://persisted.example",
      accountBearer: "persisted-static-token",
      apiKey: "persisted-api-key",
      secrets: {},
    });

    await createControlClient({ secrets: {} }).pipeline.apps.list();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://persisted.example/v1/pipeline/apps",
    );
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer persisted-static-token");
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("aomi-app-key"),
    ).toBe("persisted-api-key");

    fetchMock.mockClear();
    await createControlClient({
      baseUrl: "https://explicit.example",
      secrets: {},
    }).pipeline.apps.list();
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "https://explicit.example/api/auth/sign-in/anonymous",
      "https://explicit.example/v1/pipeline/apps",
    ]);
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer new-origin-guest");
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("aomi-app-key"),
    ).toBeNull();
  });
});
