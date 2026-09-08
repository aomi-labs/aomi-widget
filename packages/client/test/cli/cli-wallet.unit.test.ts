import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Action } from "../../src/agent/types";

const PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ORIGINAL_ENV = { ...process.env };

function action(id: string): Action {
  return {
    type: "action",
    event_id: `event-${id}`,
    sequence: 1,
    turn_id: "turn-1",
    occurred_at: 1,
    id,
    revision: 1,
    state: "pending",
    request: {
      type: "execute_evm",
      transactions: [
        {
          chain_id: 1,
          from: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
          to: "0x1111111111111111111111111111111111111111",
          data: "0x",
          label: "Transfer",
          kind: "transfer",
        },
      ],
    },
    result: null,
    created_at: 1,
    expires_at: null,
  };
}

describe("CLI Action capabilities", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-actions-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("installs an EVM capability on the session ActionHandler", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const cli = CliSession.create({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      secrets: {},
      privateKey: PRIVATE_KEY,
    });
    const session = cli.createClientSession({ privateKey: PRIVATE_KEY });
    session.actions.ingest(action("action-1"));

    expect(session.actions.canExecute("action-1")).toBe(true);
    session.close();
  });

  it("leaves execution unavailable when no signing key exists", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const cli = CliSession.create({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      secrets: {},
    });
    const session = cli.createClientSession();
    session.actions.ingest(action("action-1"));

    expect(session.actions.canExecute("action-1")).toBe(false);
    session.close();
  });

  it("signs the prepared AA personal message bytes once, without broadcasting", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { cliActionCapabilities } =
      await import("../../src/cli/action-capabilities");
    const { recoverMessageAddress, isHex } = await import("viem");
    const cli = CliSession.create({
      baseUrl: "https://example.test",
      secrets: {},
    });
    const capabilities = cliActionCapabilities(cli, {
      privateKey: PRIVATE_KEY,
    });
    const result = await capabilities.sign!(
      {
        type: "sign",
        requestId: "sign-aa",
        chainFamily: "evm",
        executionKind: "erc4337",
        operationId: "op-1",
        broadcaster: "hosted",
        signer: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
        chainId: 1,
        description: "AA",
        payloads: [{ kind: "evm_personal", message: "0x0102" }],
      },
      new AbortController().signal,
    );
    expect(result.status).toBe("signed");
    if (result.status !== "signed") throw new Error("Expected signature");
    const signature = result.outputs[0].signature;
    if (!signature || !isHex(signature))
      throw new Error("Expected hex signature");
    expect(
      await recoverMessageAddress({ message: { raw: "0x0102" }, signature }),
    ).toBe("0xFCAd0B19bB29D4674531d6f115237E16AfCE377c");
  });

  it("--aa authorizes the existing Hosted AA Action and rejects an ordinary Action", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { signCommand } = await import("../../src/cli/commands/wallet");
    const cli = CliSession.create({
      baseUrl: "https://example.test",
      secrets: {},
    });
    const session = cli.createClientSession({ privateKey: PRIVATE_KEY });
    const prepared = action("aa-1");
    prepared.request = {
      type: "sign",
      requestId: "sign-aa",
      chainFamily: "evm",
      executionKind: "erc4337",
      operationId: "op-1",
      broadcaster: "hosted",
      signer: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
      chainId: 1,
      description: "AA",
      payloads: [{ kind: "evm_personal", message: "0x0102" }],
    };
    session.actions.ingest(prepared);
    vi.spyOn(CliSession, "load").mockReturnValue(cli);
    vi.spyOn(cli, "createClientSession").mockReturnValue(session);
    vi.spyOn(session, "fetchCurrentState").mockResolvedValue();
    const execute = vi
      .spyOn(session.actions, "execute")
      .mockResolvedValue({ ...prepared, state: "resolved" });
    const close = vi.spyOn(session, "close").mockImplementation(() => {});
    await signCommand({ secrets: {}, execution: "aa" }, ["aa-1"]);
    expect(execute).toHaveBeenCalledWith("aa-1");
    // A new Action cannot be reinterpreted as AA by a signing flag.
    session.actions.ingest(action("ordinary-1"));
    await expect(
      signCommand({ secrets: {}, execution: "aa" }, ["ordinary-1"]),
    ).rejects.toBeInstanceOf(Error);
    expect(execute).toHaveBeenCalledTimes(1);
    close.mockRestore();
    session.close();
  });
});
