import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AomiClient } from "../src/client";

describe("AomiClient payment methods", () => {
  const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds payment_method to chat requests when selected", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ is_processing: false, messages: [] }),
    } as Response);

    const client = new AomiClient({ baseUrl: "http://unit.test" });
    await client.sendMessage("session-1", "hello", {
      paymentMethod: "coinbase",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://unit.test/api/chat?message=hello&app=default&payment_method=coinbase",
    );
  });

  it("can force the backend null payment path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ is_processing: false, messages: [] }),
    } as Response);

    const client = new AomiClient({ baseUrl: "http://unit.test" });
    await client.sendMessage("session-1", "hello", {
      paymentMethod: "null",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://unit.test/api/chat?message=hello&app=default&payment_method=null",
    );
  });

  it("omits payment_method for default auto selection", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ is_processing: false, messages: [] }),
    } as Response);

    const client = new AomiClient({ baseUrl: "http://unit.test" });
    await client.sendMessage("session-1", "hello", {
      paymentMethod: null,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://unit.test/api/chat?message=hello&app=default",
    );
  });
});
