import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { operateAppDetailFetch, operateFetch } from "./client";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("operate client platform scope", () => {
  it("sends the project platform with usage reads", async () => {
    await operateFetch("usage", {
      sourceId: 1620,
      platform: "somm.finance",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/operate/usage?appSourceId=1620&platform=somm.finance",
    );
  });

  it("sends the project platform with application detail reads", async () => {
    await operateAppDetailFetch(1620, 2938032, "somm.finance");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/operate/observability/detail?appSourceId=1620&applicationId=2938032&platform=somm.finance",
    );
  });
});
