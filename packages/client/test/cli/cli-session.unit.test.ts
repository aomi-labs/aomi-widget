import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Keypair } from "@solana/web3.js";
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
    const { listStoredSessions, readState } =
      await import("../../src/cli/state");

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
    expect(listStoredSessions().map((session) => session.sessionId)).toEqual([
      first.sessionId,
      fresh.sessionId,
    ]);
  });

  it("qualifies colliding EVM and SVM pending ids without breaking legacy selectors", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const cli = CliSession.create({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      secrets: {},
    });
    cli.addPendingTx({
      kind: "transaction",
      txId: 1,
      to: "0x1111111111111111111111111111111111111111",
      timestamp: 1,
      payload: {},
    });
    cli.addPendingSolTx({
      solanaId: 1,
      requestKind: "solana_sign",
      unsignedTx: "AQID",
      timestamp: 1,
      payload: {},
    });

    expect(cli.pendingSelectors()).toEqual(["evm:tx-1", "svm:tx-1"]);
    expect(cli.findPendingTx("evm:tx-1")?.txId).toBe(1);
    expect(cli.findPendingSolTx("svm:tx-1")?.solanaId).toBe(1);
    expect(cli.findPendingTx("svm:tx-1")).toBeUndefined();
    expect(cli.findPendingSolTx("evm:tx-1")).toBeUndefined();
  });

  it("journals a confirmed staged id once and removes its local pending entry", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const cli = CliSession.create({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      secrets: {},
    });
    cli.addPendingTx({
      kind: "transaction",
      txId: 7,
      to: "0x1111111111111111111111111111111111111111",
      timestamp: 1,
      payload: {},
    });
    const confirmed = {
      id: "tx-7",
      kind: "transaction" as const,
      pendingTxId: 7,
      txHash: "0xconfirmed",
      txHashes: ["0xconfirmed"],
      executionKind: "eoa",
      backendNotified: false,
      timestamp: 2,
    };

    cli.addSignedTx(confirmed);
    cli.addSignedTx(confirmed);

    expect(cli.pendingTxs).toEqual([]);
    expect(cli.signedTxs).toHaveLength(1);
    expect(cli.findSignedTransaction("tx-7")).toMatchObject(confirmed);

    cli.markSignedTxBackendNotified(7);
    expect(cli.findSignedTransaction("tx-7")?.backendNotified).toBe(true);
  });

  it("supports newSessionCommand as an explicit fresh-session command", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { CliSession } = await import("../../src/cli/cli-session");
    const { newSessionCommand } =
      await import("../../src/cli/commands/sessions");
    const { readState } = await import("../../src/cli/state");

    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    };

    const existing = CliSession.loadOrCreate({
      ...config,
      chain: 11155111,
    });
    existing.setWallet(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
    );
    existing.setAuthSession({
      sessionToken: "bff-session-token",
      expiresAt: Date.now() + 60_000,
      walletAddress: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
      chainId: 11155111,
    });

    newSessionCommand(config);

    const state = readState();
    expect(state?.sessionId).toBeDefined();
    expect(state?.sessionId).not.toBe(existing.sessionId);
    expect(state?.auth?.sessionToken).toBe("bff-session-token");
    expect(state?.privateKey).toBe(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    expect(state?.chainId).toBe(11155111);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Active session set to"),
    );
  });

  it("imports an account-owned remote session when resume has no local match", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { AgentSessionsTransport } =
      await import("../../src/agent/transport");
    const getSession = vi
      .spyOn(AgentSessionsTransport.prototype, "get")
      .mockResolvedValue({
        id: "mcp-remote-thread",
        title: null,
        updatedAt: 1,
        archived: false,
      });
    const { CliSession } = await import("../../src/cli/cli-session");
    const { resumeSessionCommand } =
      await import("../../src/cli/commands/sessions");
    const { readState } = await import("../../src/cli/state");

    const current = CliSession.create({
      baseUrl: "https://chat.aomi.dev",
      app: "default",
      secrets: {},
    });
    current.setAuthSession({
      sessionToken: "bff-session-token",
      expiresAt: Date.now() + 60_000,
    });

    await resumeSessionCommand("mcp-remote-thread");

    expect(getSession).toHaveBeenCalledWith("mcp-remote-thread");
    expect(readState()?.sessionId).toBe("mcp-remote-thread");
    expect(readState()?.auth?.sessionToken).toBe("bff-session-token");
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("imported remote session"),
    );
  });

  it("interrupts the active session through the shared Agent transport", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { AgentTransport } = await import("../../src/agent/transport");
    const interrupt = vi
      .spyOn(AgentTransport.prototype, "interrupt")
      .mockResolvedValue({
        sessionId: "cli-interrupt-session",
        status: "interrupted",
        cursor: "cursor-1",
        messages: [],
        activity: [],
        actions: [],
      });
    const { CliSession } = await import("../../src/cli/cli-session");
    const { interruptCommand } = await import("../../src/cli/commands/control");

    CliSession.create(
      {
        baseUrl: "https://chat.aomi.dev",
        accountBearer: "bff-session-token",
        secrets: {},
      },
      undefined,
      "cli-interrupt-session",
    );

    await interruptCommand({ secrets: {} });

    expect(interrupt).toHaveBeenCalledWith("cli-interrupt-session");
    expect(logSpy).toHaveBeenCalledWith(
      "Interrupted session cli-interrupt-session.",
    );
  });

  it("persists explicit wallet, chain, and backend settings on the active session", async () => {
    const { setWalletCommand, setChainCommand, setBackendCommand } =
      await import("../../src/cli/commands/preferences");
    const { readState } = await import("../../src/cli/state");

    setWalletCommand(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
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

  it("writes state directories and session files with private permissions", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { STATE_ROOT_DIR, SESSIONS_DIR, getActiveStateFilePath } =
      await import("../../src/cli/state");

    CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      privateKey:
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      execution: "eoa" as const,
      secrets: {},
    });

    const activePath = getActiveStateFilePath();
    expect(activePath).toBeTruthy();
    expect(statSync(STATE_ROOT_DIR).mode & 0o777).toBe(0o700);
    expect(statSync(SESSIONS_DIR).mode & 0o777).toBe(0o700);
    expect(statSync(activePath!).mode & 0o777).toBe(0o600);
    expect(statSync(join(stateDir, "active-session.txt")).mode & 0o777).toBe(
      0o600,
    );
  });

  it("preserves saved wallet, chain, and backend settings across fresh sessions", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const initial = CliSession.loadOrCreate({
      baseUrl: "http://127.0.0.1:18765",
      app: "default",
      chain: 1,
      publicKey: "0xabc",
      execution: "eoa" as const,
      secrets: {},
    });
    initial.setWallet(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "0xabc",
    );

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

  it("does not persist private keys supplied as one-shot config", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");

    CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      privateKey:
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      solanaPrivateKey: JSON.stringify(Array(64).fill(1)),
      execution: "eoa" as const,
      secrets: {},
    });

    expect(readState()).toEqual(
      expect.objectContaining({
        privateKey: undefined,
        svmPrivateKey: undefined,
      }),
    );
  });

  it("persists a cluster when one-shot config adds an SVM address to an existing session", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");
    const keypair = Keypair.fromSeed(Uint8Array.from(Array(32).fill(1)));
    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    };

    CliSession.loadOrCreate(config);
    CliSession.loadOrCreate({
      ...config,
      solanaPrivateKey: JSON.stringify(Array.from(keypair.secretKey)),
    });

    expect(readState()).toEqual(
      expect.objectContaining({
        svmPublicKey: keypair.publicKey.toBase58(),
        svmCluster: "solana:mainnet",
        svmPrivateKey: undefined,
      }),
    );
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

  it("stamps solana:mainnet onto legacy state files with an SVM wallet but no cluster", async () => {
    const { SESSIONS_DIR, readState } = await import("../../src/cli/state");
    const { CliSession } = await import("../../src/cli/cli-session");

    mkdirSync(SESSIONS_DIR, { recursive: true });
    writeFileSync(
      join(SESSIONS_DIR, "session-1.json"),
      JSON.stringify({
        sessionId: "legacy",
        localId: 1,
        baseUrl: "https://api.aomi.dev",
        svmPublicKey: "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
      }),
    );
    writeFileSync(join(stateDir, "active-session.txt"), "1");

    const cli = CliSession.load();
    expect(cli?.svmCluster).toBe("solana:mainnet");
    // The invariant is persisted, not just in-memory.
    expect(readState()?.svmCluster).toBe("solana:mainnet");
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
