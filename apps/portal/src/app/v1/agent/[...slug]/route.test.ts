import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveCanonicalUserId: vi.fn(),
  proxyAgentApi: vi.fn(),
}));

vi.mock("@portal/server/canonical-session", () => ({
  resolveCanonicalUserId: mocks.resolveCanonicalUserId,
}));
vi.mock("@portal/server/agent-api-proxy", () => ({
  proxyAgentApi: mocks.proxyAgentApi,
}));

import { DELETE, GET, PATCH, POST } from "./route";

describe("canonical Agent BFF route", () => {
  beforeEach(() => {
    mocks.resolveCanonicalUserId.mockReset();
    mocks.proxyAgentApi.mockReset();
  });

  it("rejects an anonymous request before proxying", async () => {
    mocks.resolveCanonicalUserId.mockResolvedValue(null);
    const response = await GET(
      new Request("https://portal.example/v1/agent/sessions"),
    );
    expect(response.status).toBe(401);
    expect(mocks.proxyAgentApi).not.toHaveBeenCalled();
  });

  it.each([GET, POST, PATCH, DELETE])(
    "delegates every allowed method",
    async (handler) => {
      mocks.resolveCanonicalUserId.mockResolvedValue("canonical-user");
      mocks.proxyAgentApi.mockResolvedValue(new Response("ok"));
      const request = new Request("https://portal.example/v1/agent/sessions", {
        method:
          handler === GET
            ? "GET"
            : handler === POST
              ? "POST"
              : handler === PATCH
                ? "PATCH"
                : "DELETE",
      });
      expect((await handler(request)).status).toBe(200);
      expect(mocks.proxyAgentApi).toHaveBeenCalledWith(
        request,
        "canonical-user",
      );
    },
  );
});
