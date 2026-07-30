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
      { signal: expect.any(AbortSignal) },
    );
  });

  it("sends the project platform with application detail reads", async () => {
    await operateAppDetailFetch(1620, 2938032, "somm.finance");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/operate/observability/detail?appSourceId=1620&applicationId=2938032&platform=somm.finance",
      { signal: expect.any(AbortSignal) },
    );
  });
});

describe("operate client deadline", () => {
  it("passes an abort signal so a stalled read cannot hang the view", async () => {
    await operateFetch("transactions");

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      { signal: AbortSignal },
    ];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("turns the abort into an actionable error", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );

    await expect(operateFetch("transactions")).rejects.toThrow(
      /transactions timed out after \d+s/,
    );
  });
});
