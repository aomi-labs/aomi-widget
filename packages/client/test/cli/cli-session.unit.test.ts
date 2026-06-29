import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("CLI session lifecycle", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-session-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("creates a fresh active session instead of reusing the current one", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");

    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    };

    const first = CliSession.loadOrCreate(config);
    const firstSession = first.createClientSession();
    firstSession.close();

    const reused = CliSession.loadOrCreate(config);
    const reusedSession = reused.createClientSession();
    reusedSession.close();

    expect(reused.sessionId).toBe(first.sessionId);
    expect(reused.clientId).toBe(first.clientId);

    const fresh = CliSession.create(config);

    expect(fresh.sessionId).not.toBe(first.sessionId);
    expect(fresh.clientId).not.toBe(first.clientId);
    expect(readState()?.sessionId).toBe(fresh.sessionId);
    expect(readState()?.clientId).toBe(fresh.clientId);
  });

  it("supports newSessionCommand as an explicit fresh-session command", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { newSessionCommand } =
      await import("../../src/cli/commands/sessions");
    const { readState } = await import("../../src/cli/state");

    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    };

    newSessionCommand(config);

    expect(readState()?.sessionId).toBeDefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Active session set to"),
    );
  });

  it("persists explicit wallet, chain, and backend settings on the active session", async () => {
    const { setWalletCommand, setChainCommand, setBackendCommand } =
      await import("../../src/cli/commands/preferences");
    const { readState } = await import("../../src/cli/state");

    setWalletCommand(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    setChainCommand("1");
    setBackendCommand("http://127.0.0.1:18765");

    expect(readState()).toEqual(
      expect.objectContaining({
        baseUrl: "http://127.0.0.1:18765",
        chainId: 1,
        publicKey: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
        privateKey:
          "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      }),
    );
  });

  it("preserves saved wallet, chain, and backend settings across fresh sessions", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const initial = CliSession.loadOrCreate({
      baseUrl: "http://127.0.0.1:18765",
      app: "default",
      chain: 1,
      publicKey: "0xabc",
      privateKey:
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      execution: "eoa" as const,
      secrets: {},
    });

    const fresh = CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      freshSession: true,
      execution: "eoa" as const,
      secrets: {},
    });

    expect(fresh.sessionId).not.toBe(initial.sessionId);
    expect(fresh.publicKey).toBe("0xabc");
    expect(fresh.privateKey).toBe(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    expect(fresh.chainId).toBe(1);
    expect(fresh.baseUrl).toBe("https://api.aomi.dev");
  });

  it("keeps distinct backend-staged transactions even when calldata matches", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const cli = CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    });

    const first = cli.addPendingTx({
      kind: "transaction",
      txId: 7,
      to: "0x1111111111111111111111111111111111111111",
      value: "0",
      data: "0xdeadbeef",
      chainId: 1,
      timestamp: 1,
      payload: { txId: 7 },
    });
    const second = cli.addPendingTx({
      kind: "transaction",
      txId: 8,
      to: "0x1111111111111111111111111111111111111111",
      value: "0",
      data: "0xdeadbeef",
      chainId: 1,
      timestamp: 2,
      payload: { txId: 8 },
    });

    expect(first?.id).toBe("tx-7");
    expect(second?.id).toBe("tx-8");
    expect(cli.pendingTxs).toHaveLength(2);
    expect(cli.pendingTxs.map((tx) => tx.txId)).toEqual([7, 8]);
  });

  it("normalizes legacy signedTx AAAddress fields on load", async () => {
    const { SESSIONS_DIR, readState } = await import("../../src/cli/state");

    mkdirSync(SESSIONS_DIR, { recursive: true });
    writeFileSync(
      join(SESSIONS_DIR, "session-1.json"),
      JSON.stringify(
        {
          sessionId: "session-1",
          baseUrl: "https://api.aomi.dev",
          signedTxs: [
            {
              id: "tx-1",
              kind: "transaction",
              txHash: "0xhash",
              AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              timestamp: 1,
            },
          ],
          localId: 1,
          createdAt: 1,
          updatedAt: 1,
        },
        null,
        2,
      ),
    );
    writeFileSync(join(stateDir, "active-session.txt"), "1");

    const state = readState();

    expect(state?.signedTxs).toEqual([
      expect.objectContaining({
        id: "tx-1",
        kind: "transaction",
        txHash: "0xhash",
        smartAccount4337: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    ]);
    expect(state?.signedTxs?.[0]).not.toHaveProperty("AAAddress");
  });

  it("dedupes replayed backend-staged requests by backend id", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const cli = CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    });

    const first = cli.addPendingTx({
      kind: "transaction",
      txId: 7,
      to: "0x1111111111111111111111111111111111111111",
      value: "0",
      data: "0xdeadbeef",
      chainId: 1,
      timestamp: 1,
      payload: { txId: 7 },
    });
    const replay = cli.addPendingTx({
      kind: "transaction",
      txId: 7,
      to: "0x1111111111111111111111111111111111111111",
      value: "0",
      data: "0xdeadbeef",
      chainId: 1,
      timestamp: 2,
      payload: { txId: 7 },
    });

    expect(first?.id).toBe("tx-7");
    expect(replay).toBeNull();
    expect(cli.pendingTxs).toHaveLength(1);
  });

  it("does not collapse distinct backend-staged eip712 requests", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const cli = CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    });

    const first = cli.addPendingTx({
      kind: "eip712_sign",
      eip712Id: 11,
      description: "Permit2 signature",
      timestamp: 1,
      payload: {
        description: "Permit2 signature",
        typed_data: { primaryType: "Permit", message: { nonce: "1" } },
      },
    });
    const second = cli.addPendingTx({
      kind: "eip712_sign",
      eip712Id: 12,
      description: "Permit2 signature",
      timestamp: 2,
      payload: {
        description: "Permit2 signature",
        typed_data: { primaryType: "Permit", message: { nonce: "1" } },
      },
    });

    expect(first?.id).toBe("tx-11");
    expect(second?.id).toBe("tx-12");
    expect(cli.pendingTxs).toHaveLength(2);
    expect(cli.pendingTxs.map((tx) => tx.eip712Id)).toEqual([11, 12]);
  });

  it("does not dedupe requests that are missing backend staging ids", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const cli = CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    });

    const first = cli.addPendingTx({
      kind: "transaction",
      to: "0x1111111111111111111111111111111111111111",
      value: "0",
      data: "0xdeadbeef",
      chainId: 1,
      timestamp: 1,
      payload: {},
    });
    const replay = cli.addPendingTx({
      kind: "transaction",
      to: "0x1111111111111111111111111111111111111111",
      value: "0",
      data: "0xdeadbeef",
      chainId: 1,
      timestamp: 2,
      payload: {},
    });

    expect(first?.id).toBe("tx-1");
    expect(replay?.id).toBe("tx-2");
    expect(cli.pendingTxs).toHaveLength(2);
  });

  it("replaces local pending state from authoritative backend user_state", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const cli = CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    });

    cli.addPendingTx({
      kind: "transaction",
      txId: 99,
      to: "0x1111111111111111111111111111111111111111",
      value: "0",
      data: "0xdeadbeef",
      chainId: 1,
      timestamp: 1,
      payload: { txId: 99 },
    });

    const synced = cli.syncPendingFromUserState({
      address: "0xabc",
      chain_id: 8453,
      is_connected: true,
      pending_txs: {
        "7": {
          chain_id: 8453,
          from: "0xabc",
          to: "0x1111111111111111111111111111111111111111",
          value: "0",
          gas: null,
          data: "0x",
          label: "Approve",
          kind: "erc20_approve",
          batch_status: "Batch [7] pending",
        },
      },
      pending_eip712s: {
        "8": {
          chain_id: 8453,
          signer: "0xabc",
          description: "Permit2 signature",
          typed_data: {
            domain: { chainId: 8453, name: "Permit2" },
            types: { Permit: [{ name: "owner", type: "address" }] },
            primaryType: "Permit",
            message: { owner: "0xabc" },
          },
        },
        "9": {
          chain_id: 1,
          signer: "0xabc",
          description: "SIWE login",
          non_typed_data: "Sign in with Ethereum",
        },
      },
    });

    expect(cli.publicKey).toBe("0xabc");
    expect(cli.chainId).toBe(8453);
    expect(synced.pendingTxs.map((tx) => tx.id)).toEqual([
      "tx-7",
      "tx-8",
      "tx-9",
    ]);
    expect(synced.pendingTxs.map((tx) => tx.kind)).toEqual([
      "transaction",
      "eip712_sign",
      "eip712_sign",
    ]);
    expect(synced.pendingTxs[2]?.payload).toMatchObject({
      non_typed_data: "Sign in with Ethereum",
    });
    expect(synced.pendingSolTxs).toEqual([]);
  });

  it("persists the account bearer on the active session", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");

    CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
      accountBearer: "bearer-1",
    });

    expect(readState()?.accountBearer).toBe("bearer-1");
  });

  it("persists legacy account provider credential fields on the active session", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");

    CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
      embeddedProvider: "privy" as const,
      embeddedProviderToken: "privy-provider-token",
    });

    const state = readState();
    expect(state?.embeddedProvider).toBe("privy");
    expect(state?.embeddedProviderToken).toBe("privy-provider-token");
  });

  it("clears a persisted bearer when switching the active session to legacy provider auth", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");

    CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
      accountBearer: "bearer-1",
    });

    CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
      embeddedProvider: "privy" as const,
      embeddedProviderToken: "privy-provider-token",
    });

    const state = readState();
    expect(state?.accountBearer).toBeUndefined();
    expect(state?.embeddedProvider).toBe("privy");
    expect(state?.embeddedProviderToken).toBe("privy-provider-token");
  });

  it("reuses the persisted account bearer when building a client without re-supplying it", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    // First invocation supplies the bearer (e.g. `aomi --account-bearer ...`).
    CliSession.loadOrCreate({
      baseUrl: "http://unit.test",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
      accountBearer: "bearer-1",
    });

    // Later invocation: the bearer is NOT passed again on the command line.
    const reused = CliSession.load();
    expect(reused).not.toBeNull();

    const stateResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => stateResponse);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const session = reused!.createClientSession();
      await session.client.fetchState(reused!.sessionId);

      const headers = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
      );
      expect(headers.get("Authorization")).toBe("Bearer bearer-1");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("does not exchange provider credentials or replace a persisted bearer", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    CliSession.loadOrCreate({
      baseUrl: "http://unit.test",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
      accountBearer: "legacy-bearer",
    });

    const cli = CliSession.load();
    expect(cli).not.toBeNull();

    const stateResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => stateResponse);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const session = cli!.createClientSession({
        embeddedProvider: "privy",
        embeddedProviderToken: "privy-provider-token",
      });
      await session.client.fetchState(cli!.sessionId);

      const headers = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
      );
      expect(headers.get("Authorization")).toBeNull();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("does not wipe local chain when backend user_state omits chain_id", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const cli = CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
      publicKey: "0xabc",
      chain: 8453,
    });

    cli.syncPendingFromUserState({
      address: "0xabc",
      is_connected: true,
      pending_txs: {},
      pending_eip712s: {},
    });

    expect(cli.publicKey).toBe("0xabc");
    expect(cli.chainId).toBe(8453);
  });
});
