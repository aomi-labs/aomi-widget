// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { DeploymentClient } from "../src/client";

function client() {
  return new DeploymentClient({
    aomi: {
      backendUrl: "https://staging-api.example.com/",
      activationToken: "act-token",
    },
  });
}

describe("DeploymentClient.listSecrets", () => {
  it("maps by_app handles and never leaks values", async () => {
    const c = client();
    vi.spyOn(c as unknown as { get: () => unknown }, "get").mockResolvedValue({
      by_app: { demo: ["$SECRET:APP:demo::API_KEY"] },
    });
    const result = await c.listSecrets({ clientId: "abc" });
    expect(result.byApp).toEqual({ demo: ["$SECRET:APP:demo::API_KEY"] });
  });

  it("defaults to empty byApp when backend omits it", async () => {
    const c = client();
    vi.spyOn(c as unknown as { get: () => unknown }, "get").mockResolvedValue({});
    const result = await c.listSecrets();
    expect(result.byApp).toEqual({});
  });
});
