import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingSolTx, PendingTx } from "../../src/cli/state";

const SENDER = "0x1111111111111111111111111111111111111111";
const OTHER_SENDER = "0x9999999999999999999999999999999999999999";
const FIRST_TO = "0x2222222222222222222222222222222222222222";
const SECOND_TO = "0x3333333333333333333333333333333333333333";

const mocks = vi.hoisted(() => ({
  fetchState: vi.fn(),
  sendSystemMessage: vi.fn(),
  close: vi.fn(),
  readState: vi.fn(),
  writeState: vi.fn(),
  refreshedPendingTxs: [] as PendingTx[],
  refreshedPendingSolTxs: [] as PendingSolTx[],
}));

vi.mock("../../src/session", () => ({
  ClientSession: class MockClientSession {
    client = {
      fetchState: mocks.fetchState,
      sendSystemMessage: mocks.sendSystemMessage,
    };

    resolveUserState = vi.fn();
    close = mocks.close;
  },
}));

vi.mock("../../src/cli/state", async () => {
  const actual = await vi.importActual<typeof import("../../src/cli/state")>(
    "../../src/cli/state",
  );
  return {
    ...actual,
    readState: mocks.readState,
    writeState: mocks.writeState,
    syncPendingTxsFromUserState: (
      state: import("../../src/cli/state").CliSessionState,
    ) => {
      state.pendingTxs = [...mocks.refreshedPendingTxs];
      state.pendingSolTxs = [...mocks.refreshedPendingSolTxs];
      mocks.writeState(state);
      return {
        pendingTxs: state.pendingTxs,
        pendingSolTxs: state.pendingSolTxs,
      };
    },
  };
});

import { exportCommand } from "../../src/cli/commands/export";

function pendingTx(id: number, overrides: Partial<PendingTx> = {}): PendingTx {
  return {
    id: `tx-${id}`,
    kind: "transaction",
    txId: id,
    from: SENDER,
    to: id === 1 ? FIRST_TO : SECOND_TO,
    value: "0",
    data: "0x",
    chainId: 4326,
    timestamp: id,
    payload: { txId: id },
    ...overrides,
  };
}

function state(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "session-1",
    clientId: "client-1",
    baseUrl: "http://127.0.0.1:8080",
    app: "default",
    publicKey: SENDER,
    chainId: 4326,
    pendingTxs: [pendingTx(1, { data: "0xdead" })],
    pendingSolTxs: [],
    signedTxs: [],
    ...overrides,
  };
}

const config = {
  baseUrl: "http://127.0.0.1:8080",
  app: "default",
  secrets: {},
};

describe("aomi tx export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AOMI_CLI_STRICT_EXIT = "1";
    mocks.refreshedPendingTxs = [
      pendingTx(1, { data: "0xaabb", value: "0" }),
      pendingTx(2, { data: undefined, value: "1000" }),
    ];
    mocks.refreshedPendingSolTxs = [];
    mocks.readState.mockReturnValue(state());
    mocks.fetchState.mockResolvedValue({ user_state: { pending: {} } });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.AOMI_CLI_STRICT_EXIT;
    vi.restoreAllMocks();
  });

  it("refreshes state and prints only ordered EIP-5792 JSON", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await exportCommand(config, ["tx-2", "tx-1"]);

    expect(mocks.fetchState).toHaveBeenCalledWith(
      "session-1",
      undefined,
      "client-1",
    );
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(mocks.sendSystemMessage).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledOnce();
    expect(JSON.parse(stdout.mock.calls[0]?.[0] as string)).toEqual({
      version: "2.0.0",
      from: SENDER,
      chainId: "0x10e6",
      atomicRequired: false,
      calls: [
        { to: SECOND_TO, data: "0x", value: "0x3e8" },
        { to: FIRST_TO, data: "0xaabb", value: "0x0" },
      ],
    });
  });

  it("prints the call array in moss format", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await exportCommand(config, ["tx-2", "tx-1"], "moss");

    expect(JSON.parse(stdout.mock.calls[0]?.[0] as string)).toEqual([
      { to: SECOND_TO, data: "0x", value: "0x3e8" },
      { to: FIRST_TO, data: "0xaabb", value: "0x0" },
    ]);
  });

  it("prints a single MetaMask transaction handoff", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await exportCommand(config, ["tx-1"], "metamask");

    expect(JSON.parse(stdout.mock.calls[0]?.[0] as string)).toEqual({
      chainId: 4326,
      payload: { to: FIRST_TO, data: "0xaabb", value: "0x0" },
    });
  });

  it("rejects multiple calls and unknown format aliases", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await expect(
      exportCommand(config, ["tx-1", "tx-2"], "metamask"),
    ).rejects.toMatchObject({ code: 1 });
    await expect(exportCommand(config, ["tx-1"], "mm")).rejects.toMatchObject({
      code: 1,
    });
    expect(stdout).not.toHaveBeenCalled();
  });

  it("requires selectors and an active session", async () => {
    await expect(exportCommand(config, [])).rejects.toMatchObject({ code: 1 });

    mocks.readState.mockReturnValue(null);
    await expect(exportCommand(config, ["tx-1"])).rejects.toMatchObject({
      code: 1,
    });
  });

  it("rejects duplicate selectors after chain qualification", async () => {
    await expect(
      exportCommand(config, ["tx-1", "evm:tx-1"]),
    ).rejects.toMatchObject({ code: 1 });
  });

  it("rejects EIP-712 and Solana signing requests", async () => {
    mocks.refreshedPendingTxs = [
      pendingTx(1, {
        kind: "eip712_sign",
        txId: undefined,
        eip712Id: 1,
        to: undefined,
      }),
    ];
    await expect(exportCommand(config, ["tx-1"])).rejects.toMatchObject({
      code: 1,
    });

    mocks.refreshedPendingTxs = [];
    mocks.refreshedPendingSolTxs = [
      {
        id: "tx-1",
        solanaId: 1,
        unsignedTx: "AA==",
        timestamp: 1,
        payload: {},
      },
    ];
    await expect(exportCommand(config, ["svm:tx-1"])).rejects.toMatchObject({
      code: 1,
    });
  });

  it("rejects ambiguous cross-family selectors", async () => {
    mocks.refreshedPendingSolTxs = [
      {
        id: "tx-1",
        solanaId: 1,
        unsignedTx: "AA==",
        timestamp: 1,
        payload: {},
      },
    ];

    await expect(exportCommand(config, ["tx-1"])).rejects.toMatchObject({
      code: 1,
    });
  });

  it("rejects mixed chains and never defaults a missing chain to Ethereum", async () => {
    mocks.refreshedPendingTxs = [
      pendingTx(1, { chainId: 1 }),
      pendingTx(2, { chainId: 10 }),
    ];
    await expect(exportCommand(config, ["tx-1", "tx-2"])).rejects.toMatchObject(
      { code: 1 },
    );

    mocks.readState.mockReturnValue(state({ chainId: undefined }));
    mocks.refreshedPendingTxs = [pendingTx(1, { chainId: undefined })];
    await expect(exportCommand(config, ["tx-1"])).rejects.toMatchObject({
      code: 1,
    });
  });

  it("rejects mixed, missing, and session-mismatched senders", async () => {
    mocks.readState.mockReturnValue(state({ publicKey: undefined }));
    mocks.refreshedPendingTxs = [
      pendingTx(1),
      pendingTx(2, { from: OTHER_SENDER }),
    ];
    await expect(exportCommand(config, ["tx-1", "tx-2"])).rejects.toMatchObject(
      { code: 1 },
    );

    mocks.refreshedPendingTxs = [pendingTx(1, { from: undefined })];
    await expect(exportCommand(config, ["tx-1"])).rejects.toMatchObject({
      code: 1,
    });

    mocks.readState.mockReturnValue(state());
    mocks.refreshedPendingTxs = [pendingTx(1, { from: OTHER_SENDER })];
    await expect(exportCommand(config, ["tx-1"])).rejects.toMatchObject({
      code: 1,
    });
  });

  it("rejects malformed refreshed calldata before writing stdout", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    mocks.refreshedPendingTxs = [pendingTx(1, { data: "0x123" })];

    await expect(exportCommand(config, ["tx-1"])).rejects.toMatchObject({
      code: 1,
    });
    expect(stdout).not.toHaveBeenCalled();
  });
});
