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

import { GET, POST } from "./route";

describe("canonical Pipeline BFF route", () => {
  beforeEach(() => {
    mocks.resolveCanonicalUserId.mockReset();
    mocks.proxyAgentApi.mockReset();
  });

  it("rejects an anonymous request before proxying", async () => {
    mocks.resolveCanonicalUserId.mockResolvedValue(null);
    const response = await GET(
      new Request("https://portal.example/v1/pipeline/tools"),
    );
    expect(response.status).toBe(401);
    expect(mocks.proxyAgentApi).not.toHaveBeenCalled();
  });

  it.each([GET, POST])("delegates every supported method", async (handler) => {
    mocks.resolveCanonicalUserId.mockResolvedValue("canonical-user");
    mocks.proxyAgentApi.mockResolvedValue(new Response("ok"));
    const request = new Request("https://portal.example/v1/pipeline/tools", {
      method: handler === GET ? "GET" : "POST",
    });
    expect((await handler(request)).status).toBe(200);
    expect(mocks.proxyAgentApi).toHaveBeenCalledWith(request, "canonical-user");
  });
});
