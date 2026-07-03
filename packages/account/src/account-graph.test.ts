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
      identityInsertError?: { code: string };
    },
  ) {}
  async query(sql: string): Promise<QueryResponse> {
    this.calls.push(sql.trim().split("\n")[0].trim());
    if (sql.includes("from auth_providers")) {
      return this.opts.selectResponses.shift() ?? { rows: [] };
    }
    if (
      sql.includes("insert into auth_providers") &&
      this.opts.identityInsertError
    ) {
      throw this.opts.identityInsertError;
    }
    if (sql.includes("insert into auth_providers")) {
      return { rows: [{ id: 1 }] };
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
    expect(client.calls.some((c) => c.startsWith("insert into users"))).toBe(
      true,
    );
    expect(client.calls).toContain("commit");
  });

  it("uses a provided Aomi account id as the backend user id", async () => {
    const client = new FakeClient({ selectResponses: [{ rows: [] }] });
    mockPoolWith(client);
    const { resolveOrCreateCanonicalUser } = await loadModule();

    const result = await resolveOrCreateCanonicalUser({
      provider: "better_auth",
      subject: "better-user-1",
      canonicalUserId: "aomi-account-1",
    });

    expect(result).toEqual({ userId: "aomi-account-1", created: true });
    expect(client.calls).toContain("begin");
    expect(client.calls.some((c) => c.startsWith("insert into users"))).toBe(
      true,
    );
    expect(
      client.calls.some((c) => c.startsWith("insert into auth_providers")),
    ).toBe(true);
    expect(client.calls).toContain("commit");
  });

  it("rebinds an existing Better Auth identity to the provided Aomi account id", async () => {
    const client = new FakeClient({
      selectResponses: [{ rows: [{ user_id: "old-backend-user" }] }],
    });
    mockPoolWith(client);
    const { resolveOrCreateCanonicalUser } = await loadModule();

    const result = await resolveOrCreateCanonicalUser({
      provider: "better_auth",
      subject: "better-user-1",
      canonicalUserId: "aomi-account-1",
    });

    expect(result).toEqual({ userId: "aomi-account-1", created: false });
    expect(client.calls).toContain("begin");
    expect(client.calls.some((c) => c.startsWith("insert into users"))).toBe(
      true,
    );
    expect(
      client.calls.some((c) => c.startsWith("update auth_providers")),
    ).toBe(true);
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

  it("rebinds a concurrent Better Auth winner to the provided Aomi account id", async () => {
    const client = new FakeClient({
      selectResponses: [{ rows: [] }, { rows: [{ user_id: "race-winner" }] }],
      identityInsertError: { code: "23505" },
    });
    mockPoolWith(client);
    const { resolveOrCreateCanonicalUser } = await loadModule();

    const result = await resolveOrCreateCanonicalUser({
      provider: "better_auth",
      subject: "better-user-1",
      canonicalUserId: "aomi-account-1",
    });

    expect(result).toEqual({ userId: "aomi-account-1", created: false });
    expect(client.calls).toContain("rollback");
    expect(
      client.calls.some((c) => c.startsWith("update auth_providers")),
    ).toBe(true);
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
