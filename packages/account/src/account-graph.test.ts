import { afterEach, describe, expect, it, vi } from "vitest";

// A fake pg client/pool driven by SQL substrings, so we can exercise the
// resolve-or-create control flow (find / create / race) without a database.
type QueryResponse = { rows: Array<Record<string, unknown>> };

class FakeClient {
  readonly calls: string[] = [];
  released = false;
  constructor(
    private readonly opts: {
      selectResponses: QueryResponse[]; // consumed in order, per subject SELECT
      walletResponse?: QueryResponse; // consumed by the wallet-proven SIWE lookup
      identityInsertError?: { code: string };
    },
  ) {}
  async query(sql: string): Promise<QueryResponse> {
    this.calls.push(sql.trim().split("\n")[0].trim());
    if (sql.includes("wallet_provider = 'wallet'")) {
      return this.opts.walletResponse ?? { rows: [] };
    }
    if (sql.includes("from auth_identities")) {
      return this.opts.selectResponses.shift() ?? { rows: [] };
    }
    if (sql.includes("insert into auth_identities") && this.opts.identityInsertError) {
      throw this.opts.identityInsertError;
    }
    return { rows: [] };
  }
  release() {
    this.released = true;
  }
}

function mockPoolWith(client: FakeClient) {
  return vi.doMock("./db", () => ({
    getPool: () => ({ connect: async () => client }),
  }));
}

async function loadModule() {
  return import("./account-graph");
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("./db");
});

describe("resolveOrCreateCanonicalUser", () => {
  it("returns the existing canonical user without creating", async () => {
    const client = new FakeClient({
      selectResponses: [{ rows: [{ user_id: "u-existing" }] }],
    });
    mockPoolWith(client);
    const { resolveOrCreateCanonicalUser } = await loadModule();

    const result = await resolveOrCreateCanonicalUser({
      provider: "privy",
      subject: "did:privy:alice",
    });

    expect(result).toEqual({ userId: "u-existing", created: false });
    // No write path: never opened a transaction.
    expect(client.calls).not.toContain("begin");
    expect(client.released).toBe(true);
  });

  it("does not resolve provider logins by wallet-keyed accounts", async () => {
    const client = new FakeClient({
      selectResponses: [{ rows: [] }],
      walletResponse: { rows: [{ user_id: "u-wallet-first" }] },
    });
    mockPoolWith(client);
    const { resolveOrCreateCanonicalUser } = await loadModule();

    const result = await resolveOrCreateCanonicalUser({
      provider: "para",
      subject: "para-sub-xyz",
    });

    expect(result.created).toBe(true);
    expect(result.userId).not.toBe("u-wallet-first");
    expect(client.calls).toContain("begin");
  });

  it("creates a new user + identity on first login", async () => {
    const client = new FakeClient({ selectResponses: [{ rows: [] }] });
    mockPoolWith(client);
    const { resolveOrCreateCanonicalUser } = await loadModule();

    const result = await resolveOrCreateCanonicalUser({
      provider: "privy",
      subject: "did:privy:new",
    });

    expect(result.created).toBe(true);
    // A real UUID for the canonical id (the bearer `sub`), never the DID.
    expect(result.userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(result.userId).not.toBe("did:privy:new");
    expect(client.calls).toContain("begin");
    expect(client.calls.some((c) => c.startsWith("insert into users"))).toBe(true);
    expect(client.calls).toContain("commit");
  });

  it("converges on the winner when a concurrent first login races (23505)", async () => {
    const client = new FakeClient({
      // First SELECT: nobody yet. Second SELECT (after the unique violation):
      // the concurrent winner.
      selectResponses: [{ rows: [] }, { rows: [{ user_id: "u-winner" }] }],
      identityInsertError: { code: "23505" },
    });
    mockPoolWith(client);
    const { resolveOrCreateCanonicalUser } = await loadModule();

    const result = await resolveOrCreateCanonicalUser({
      provider: "privy",
      subject: "did:privy:racer",
    });

    expect(result).toEqual({ userId: "u-winner", created: false });
    expect(client.calls).toContain("rollback");
    expect(client.released).toBe(true);
  });

  it("rejects a missing provider or subject", async () => {
    const client = new FakeClient({ selectResponses: [] });
    mockPoolWith(client);
    const { resolveOrCreateCanonicalUser } = await loadModule();

    await expect(
      resolveOrCreateCanonicalUser({ provider: "privy", subject: "  " }),
    ).rejects.toThrow(/provider and subject/);
  });
});

describe("resolveOrCreateByWallet", () => {
  it("returns the existing wallet-keyed user without creating", async () => {
    const client = new FakeClient({
      selectResponses: [],
      walletResponse: { rows: [{ user_id: "u-wallet" }] },
    });
    mockPoolWith(client);
    const { resolveOrCreateByWallet } = await loadModule();

    const result = await resolveOrCreateByWallet(
      "0x245677Fb496D156e9D6047791E2CFbd34F400825",
    );

    expect(result).toEqual({ userId: "u-wallet", created: false });
    // Resolve-only: never opened a write transaction.
    expect(client.calls).not.toContain("begin");
    expect(client.released).toBe(true);
  });

  it("creates a new user + wallet identity on first SIWE login", async () => {
    // No existing wallet identity → the create path runs.
    const client = new FakeClient({
      selectResponses: [],
      walletResponse: { rows: [] },
    });
    mockPoolWith(client);
    const { resolveOrCreateByWallet } = await loadModule();

    const result = await resolveOrCreateByWallet(
      "0x245677Fb496D156e9D6047791E2CFbd34F400825",
    );

    expect(result.created).toBe(true);
    expect(result.userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(client.calls).toContain("begin");
    expect(client.calls.some((c) => c.startsWith("insert into users"))).toBe(true);
    expect(
      client.calls.some((c) => c.startsWith("insert into auth_identities")),
    ).toBe(true);
    expect(client.calls).toContain("commit");
  });

  it("converges on the winner when two first SIWE logins race (23505)", async () => {
    // walletResponse drives BOTH the pre-insert lookup (empty) and the
    // post-violation re-read (winner), since FakeClient returns it for every
    // `wallet_provider = 'wallet'` query. Use a stateful response.
    let walletLookups = 0;
    const client = new (class extends FakeClient {
      async query(sql: string): Promise<QueryResponse> {
        this.calls.push(sql.trim().split("\n")[0].trim());
        if (sql.includes("wallet_provider = 'wallet'")) {
          walletLookups += 1;
          return walletLookups === 1
            ? { rows: [] }
            : { rows: [{ user_id: "u-winner" }] };
        }
        if (sql.includes("insert into auth_identities")) {
          throw { code: "23505" };
        }
        return { rows: [] };
      }
    })({ selectResponses: [] });
    mockPoolWith(client);
    const { resolveOrCreateByWallet } = await loadModule();

    const result = await resolveOrCreateByWallet(
      "0x245677Fb496D156e9D6047791E2CFbd34F400825",
    );

    expect(result).toEqual({ userId: "u-winner", created: false });
    expect(client.calls).toContain("rollback");
    expect(client.released).toBe(true);
  });

  it("rejects a missing wallet address", async () => {
    const client = new FakeClient({ selectResponses: [] });
    mockPoolWith(client);
    const { resolveOrCreateByWallet } = await loadModule();

    await expect(resolveOrCreateByWallet("  ")).rejects.toThrow(
      /wallet address/,
    );
  });
});
