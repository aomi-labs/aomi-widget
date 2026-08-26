// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@aomi-labs/account", () => ({
  getPool: () => ({ query: mocks.query }),
}));

import { resolveSessionWallets } from "./wallet-selection";

const USER = "user-1";
const SESSION = "mcp-session";

/** The two wallets from the incident: one funded, one stale. */
const FUNDED = "0xac931115b9f4e9105d538e3d06da52cbd18c11df";
const STALE = "0x92095fd4274d5f90d76d654616d41560b4c8bf56";

type Row = Record<string, unknown>;

/**
 * Route queries by the table they touch so a test states account contents and
 * remembered selections, not statement order.
 */
function db(options: { owned?: Row[]; selected?: Row[] } = {}) {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  mocks.query.mockImplementation(async (sql: string, params: unknown[]) => {
    // Route on the statement verb, not on the table name: `delete from
    // mcp_session_wallets` also contains "from mcp_session_wallets".
    const isRead = sql.trimStart().toLowerCase().startsWith("select");
    if (isRead && sql.includes("public_keys")) {
      return { rows: options.owned ?? [] };
    }
    if (isRead && sql.includes("mcp_session_wallets")) {
      return { rows: options.selected ?? [] };
    }
    writes.push({ sql, params });
    return { rows: [], rowCount: 1 };
  });
  return writes;
}

describe("MCP session wallet selection", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it("refuses to choose between an account's wallets", async () => {
    db({
      owned: [
        { chain_type: "evm", address: STALE, is_primary: true },
        { chain_type: "evm", address: FUNDED, is_primary: false },
      ],
    });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      familyInPlay: "evm",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.error).toBe("wallet_selection_required");
    if (result.failure.error !== "wallet_selection_required") return;
    // Both candidates are offered. Notably the `is_primary` wallet is not
    // silently preferred — that preference is exactly what shipped the wrong
    // address before.
    expect(result.failure.selection_required).toEqual([
      {
        family: "evm",
        wallets: [
          { address: STALE, is_primary: true },
          { address: FUNDED, is_primary: false },
        ],
      },
    ]);
  });

  it("uses the account's only wallet without asking", async () => {
    db({ owned: [{ chain_type: "evm", address: FUNDED, is_primary: false }] });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      familyInPlay: "evm",
    });

    expect(result).toEqual({ ok: true, wallets: { evm: FUNDED } });
  });

  it("accepts an explicitly chosen wallet and remembers it for the session", async () => {
    const writes = db({
      owned: [
        { chain_type: "evm", address: STALE, is_primary: true },
        { chain_type: "evm", address: FUNDED, is_primary: false },
      ],
    });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      requested: { evm: FUNDED },
      familyInPlay: "evm",
    });

    expect(result).toEqual({ ok: true, wallets: { evm: FUNDED } });
    expect(writes).toHaveLength(1);
    expect(writes[0].sql).toContain("insert into mcp_session_wallets");
    expect(writes[0].params).toEqual([SESSION, USER, "evm", FUNDED]);
  });

  it("matches an owned wallet regardless of address casing", async () => {
    db({ owned: [{ chain_type: "evm", address: FUNDED, is_primary: false }] });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      requested: { evm: FUNDED.toUpperCase().replace("0X", "0x") },
      familyInPlay: "evm",
    });

    expect(result).toEqual({ ok: true, wallets: { evm: FUNDED } });
  });

  it("rejects an address the account does not own instead of substituting one", async () => {
    db({ owned: [{ chain_type: "evm", address: STALE, is_primary: true }] });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      requested: { evm: FUNDED },
      familyInPlay: "evm",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.error).toBe("wallet_not_owned");
    if (result.failure.error !== "wallet_not_owned") return;
    expect(result.failure.requested).toBe(FUNDED);
    // The owned wallet must not leak out as a consolation prize.
    expect(JSON.stringify(result.failure)).not.toContain(STALE);
  });

  it("reuses the session's remembered choice on later turns", async () => {
    const writes = db({
      owned: [
        { chain_type: "evm", address: STALE, is_primary: true },
        { chain_type: "evm", address: FUNDED, is_primary: false },
      ],
      selected: [{ chain_family: "evm", address: FUNDED }],
    });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      familyInPlay: "evm",
    });

    expect(result).toEqual({ ok: true, wallets: { evm: FUNDED } });
    expect(writes).toHaveLength(0);
  });

  it("follows a switch to a different wallet mid-session", async () => {
    const writes = db({
      owned: [
        { chain_type: "evm", address: STALE, is_primary: true },
        { chain_type: "evm", address: FUNDED, is_primary: false },
      ],
      selected: [{ chain_family: "evm", address: FUNDED }],
    });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      requested: { evm: STALE },
      familyInPlay: "evm",
    });

    expect(result).toEqual({ ok: true, wallets: { evm: STALE } });
    expect(writes[0].params).toEqual([SESSION, USER, "evm", STALE]);
  });

  it("drops a remembered wallet the account no longer owns", async () => {
    const writes = db({
      owned: [{ chain_type: "evm", address: FUNDED, is_primary: false }],
      selected: [{ chain_family: "evm", address: STALE }],
    });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      familyInPlay: "evm",
    });

    // Unlinked wallet is forgotten, and the remaining unambiguous wallet is
    // used rather than the turn failing.
    expect(result).toEqual({ ok: true, wallets: { evm: FUNDED } });
    expect(writes[0].sql).toContain("delete from mcp_session_wallets");
    expect(writes[0].params).toEqual([SESSION, "evm"]);
    // …and the replacement choice is recorded, so the next turn is stable.
    expect(writes[1].sql).toContain("insert into mcp_session_wallets");
    expect(writes[1].params).toEqual([SESSION, USER, "evm", FUNDED]);
  });

  it("narrows the check to the declared chain family", async () => {
    db({
      owned: [
        { chain_type: "evm", address: FUNDED, is_primary: false },
        { chain_type: "svm", address: "SolOne", is_primary: false },
        { chain_type: "svm", address: "SolTwo", is_primary: false },
      ],
    });

    // Ambiguous Solana wallets must not block a declared EVM turn.
    const evmTurn = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      familyInPlay: "evm",
    });
    expect(evmTurn).toEqual({ ok: true, wallets: { evm: FUNDED } });

    // With no declared family the same account is ambiguous and must ask.
    const openTurn = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
    });
    expect(openTurn.ok).toBe(false);
    if (openTurn.ok) return;
    expect(openTurn.failure.error).toBe("wallet_selection_required");
  });

  it("asks for a wallet rather than proceeding when the store is missing", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("from public_keys")) {
        return {
          rows: [
            { chain_type: "evm", address: STALE, is_primary: true },
            { chain_type: "evm", address: FUNDED, is_primary: false },
          ],
        };
      }
      // Pre-migration: the selection table does not exist yet.
      throw Object.assign(new Error("relation does not exist"), {
        code: "42P01",
      });
    });

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      familyInPlay: "evm",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.error).toBe("wallet_selection_required");
  });

  it("does not blame the caller when the account graph is unreadable", async () => {
    mocks.query.mockRejectedValue(new Error("connection refused"));

    const result = await resolveSessionWallets({
      canonicalUserId: USER,
      sessionId: SESSION,
      requested: { evm: FUNDED },
      familyInPlay: "evm",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Not wallet_not_owned: an unreadable lookup is not evidence of anything
    // about the caller's address.
    expect(result.failure.error).toBe("wallet_lookup_unavailable");
  });
});
