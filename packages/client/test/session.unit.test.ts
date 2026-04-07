import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient, Session } from "../src/index";
import type { AomiChatResponse, AomiStateResponse } from "../src/index";
import { CLIENT_TYPE_WEB_UI } from "../src/index";

function createMockClient() {
  const client = new AomiClient({ baseUrl: "http://unit.test" });
  vi.spyOn(client, "subscribeSSE").mockImplementation(() => () => {});

  const sendMessage = vi
    .spyOn(client, "sendMessage")
    .mockResolvedValue({ is_processing: false, messages: [] });
  const fetchState = vi
    .spyOn(client, "fetchState")
    .mockResolvedValue({ is_processing: false, messages: [] });

  return { client, sendMessage, fetchState };
}

describe("ClientSession ext helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes ext via addExtValue on empty user state", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-1" });

    session.addExtValue("SIMMER_API_KEY", "sk_live_1");
    await session.sendAsync("hello");

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][2]?.userState).toEqual({
      ext: { SIMMER_API_KEY: "sk_live_1" },
    });

    session.close();
  });

  it("preserves wallet fields and merges ext values", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-2",
      userState: {
        address: "0xabc",
        chainId: 1,
        isConnected: true,
        ensName: "wallet.eth",
      },
    });

    session.addExtValue("SIMMER_API_KEY", "sk_live_2");
    session.addExtValue("PARA_API_KEY", "para_live_2");
    await session.sendAsync("ping");

    expect(sendMessage.mock.calls[0][2]?.userState).toEqual({
      address: "0xabc",
      chainId: 1,
      isConnected: true,
      ensName: "wallet.eth",
      ext: {
        SIMMER_API_KEY: "sk_live_2",
        PARA_API_KEY: "para_live_2",
      },
    });

    session.close();
  });

  it("removeExtValue removes a key and deletes ext when empty", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-3",
      userState: { address: "0xdef", isConnected: true },
    });

    session.addExtValue("SIMMER_API_KEY", "sk_live_3");
    session.addExtValue("PARA_API_KEY", "para_live_3");
    session.removeExtValue("PARA_API_KEY");
    await session.sendAsync("first");

    expect(sendMessage.mock.calls[0][2]?.userState).toEqual({
      address: "0xdef",
      isConnected: true,
      ext: { SIMMER_API_KEY: "sk_live_3" },
    });

    session.removeExtValue("SIMMER_API_KEY");
    await session.sendAsync("second");

    expect(sendMessage.mock.calls[1][2]?.userState).toEqual({
      address: "0xdef",
      isConnected: true,
    });
    expect(sendMessage.mock.calls[1][2]?.userState?.ext).toBeUndefined();

    session.close();
  });

  it("syncUserState carries ext to fetchState", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-4" });

    session.addExtValue("SIMMER_API_KEY", "sk_live_4");
    await session.syncUserState();

    expect(fetchState).toHaveBeenCalledWith(
      "session-unit-4",
      {
        ext: { SIMMER_API_KEY: "sk_live_4" },
      },
      expect.any(String),
    );

    session.close();
  });

  it("applies clientType onto userState ext from session options", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-4b",
      clientType: CLIENT_TYPE_WEB_UI,
      userState: { address: "0x123", isConnected: true },
    });

    await session.sendAsync("hello from web");

    expect(sendMessage.mock.calls[0][2]?.userState).toEqual({
      address: "0x123",
      isConnected: true,
      ext: { client_type: CLIENT_TYPE_WEB_UI },
    });

    session.close();
  });

  it("accepts backend user_state superset when ext keys match expected subset", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-5",
      userState: {
        address: "0x999",
        isConnected: true,
        ext: { SIMMER_API_KEY: "sk_live_5" },
      },
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0x999",
        isConnected: true,
        ext: {
          SIMMER_API_KEY: "sk_live_5",
          PARA_API_KEY: "para_live_5",
        },
      },
    } satisfies AomiChatResponse);

    await expect(session.sendAsync("subset check")).resolves.toMatchObject({
      is_processing: false,
    });

    session.close();
  });

  it("throws when backend user_state ext mismatches expected subset", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-6",
      userState: {
        address: "0x888",
        isConnected: true,
        ext: { SIMMER_API_KEY: "expected" },
      },
    });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0x888",
        isConnected: true,
        ext: { SIMMER_API_KEY: "different" },
      },
    } satisfies AomiStateResponse);

    await expect(session.syncUserState()).rejects.toThrow(
      "Backend user_state mismatch",
    );

    session.close();
  });
});
