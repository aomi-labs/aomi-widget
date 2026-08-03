// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createLaunchClient } from "../src/launch/client";

/** Capture the URL + body of every request the client makes. */
function recordingClient(platform?: string) {
  const calls: { url: string; body?: unknown }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  const client = createLaunchClient({
    platform,
    fetch: fetchMock as unknown as typeof fetch,
  });
  return { client, calls };
}

describe("createLaunchClient — bound platform", () => {
  it("carries the bound platform into query reads", async () => {
    const { client, calls } = recordingClient("somm.finance");

    await client.status({ deploymentId: "d-1" });
    await client.deployments.history({ appSourceId: 7 });
    await client.deployments.secrets({ appSourceId: 7 });

    for (const { url } of calls) {
      expect(url).toContain("platform=somm.finance");
    }
  });

  it("carries the bound platform into write bodies", async () => {
    const { client, calls } = recordingClient("somm.finance");

    await client.deploy({ appSourceId: 7, sourceRef: "abc123" });
    await client.createRepo({ installationId: "55" });
    await client.deployments.promote({ deploymentId: "d-1", appSourceId: 7 });

    for (const { body } of calls) {
      expect(body).toMatchObject({ platform: "somm.finance" });
    }
  });

  /** The BFF route always read `body.platform`; the client used to drop it. */
  it("sends the platform on redeploy", async () => {
    const { client, calls } = recordingClient("somm.finance");

    await client.redeploy({ appSourceId: 7 });

    expect(calls[0]?.body).toMatchObject({
      appSourceId: 7,
      platform: "somm.finance",
    });
  });

  it("lets an explicit per-call platform win", async () => {
    const { client, calls } = recordingClient("somm.finance");

    await client.deployments.history({ appSourceId: 7, platform: "community" });

    expect(calls[0]?.url).toContain("platform=community");
    expect(calls[0]?.url).not.toContain("somm.finance");
  });

  it("omits platform entirely when none is bound", async () => {
    const { client, calls } = recordingClient();

    await client.status({ deploymentId: "d-1" });
    await client.deploy({ appSourceId: 7, sourceRef: "abc123" });

    expect(calls[0]?.url).not.toContain("platform=");
    expect(calls[1]?.body).not.toHaveProperty("platform");
  });

  it("derives a differently-scoped client without mutating the original", async () => {
    const { client, calls } = recordingClient("somm.finance");
    const other = client.forPlatform("community");

    await other.status({ deploymentId: "d-1" });
    await client.status({ deploymentId: "d-2" });

    expect(client.platform).toBe("somm.finance");
    expect(other.platform).toBe("community");
    expect(calls[0]?.url).toContain("platform=community");
    expect(calls[1]?.url).toContain("platform=somm.finance");
  });

  it("routes the two mounts to their own paths", async () => {
    const { client, calls } = recordingClient();

    await client.status({ deploymentId: "d-1" });
    await client.deployments.status({ deploymentId: "d-1" });

    expect(calls[0]?.url).toContain("/api/bff/launch/status");
    expect(calls[1]?.url).toContain("/api/bff/deployments/status");
  });
});
