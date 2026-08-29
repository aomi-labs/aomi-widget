import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/cli/cli-session", () => ({
  CliSession: { load: () => null },
}));

import { createControlClient } from "../../src/cli/context";

describe("CLI explicit API bearer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("authorizes public Pipeline requests with the explicit scoped bearer", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer scoped-api-bearer",
        );
        return Response.json({
          kind: "directory",
          path: "/v1/pipeline/apps",
          entries: [],
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createControlClient({
      baseUrl: "https://api.example",
      accountBearer: "scoped-api-bearer",
      secrets: {},
    });
    await client.pipeline.apps.list();

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
