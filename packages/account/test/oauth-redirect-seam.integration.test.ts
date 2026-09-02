import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The seam that matters for MCP login: a persisted client row must survive
 * Better Auth's own read path and satisfy its redirect matcher.
 *
 * A Codex-style client registers a native loopback callback and then authorizes
 * from a *different* ephemeral port with an identical path. RFC 8252 §7.3 says
 * the port must be ignored, so this has to reach the login redirect. Staging has
 * been answering `invalid_redirect` here while the stored row is provably
 * correct, so the failure lives between the row and the match — which is
 * exactly what this exercises, rather than registration or storage in isolation.
 *
 * Needs a real Postgres carrying the Better Auth schema; set
 * AOMI_SEAM_DATABASE_URL to run it. Skipped otherwise so unit suites stay
 * database-free.
 */
const DB = process.env.AOMI_SEAM_DATABASE_URL;
const PATH = "/callback/-w5Z67Pmuseb";
const REGISTERED = `http://127.0.0.1:62901${PATH}`;
const AUTHORIZED = `http://127.0.0.1:62902${PATH}`;
const BASE = "https://portal.example";

describe.skipIf(!DB)("OAuth redirect seam: row -> getClient -> match", () => {
  let auth: typeof import("../src/better-auth/auth").auth;
  let pool: ReturnType<typeof import("../src/db/pool").getPool>;

  beforeAll(async () => {
    process.env.DATABASE_URL = DB;
    process.env.BETTER_AUTH_URL = BASE;
    process.env.BETTER_AUTH_SECRET ??= "a".repeat(64);
    // NOT "test": that switch drops the resource seeding and the plugin's init
    // hook, so a test-mode run would not exercise the deployed configuration.
    process.env.NODE_ENV = "production";
    ({ auth } = await import("../src/better-auth/auth"));
    ({ getPool: pool } = await import("../src/db/pool")) as never;
  });

  afterAll(async () => {
    const { getPool } = await import("../src/db/pool");
    await getPool().end();
  });

  it("accepts a loopback callback from a different port", async () => {
    const registration = await auth.handler(
      new Request(`${BASE}/api/auth/oauth2/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_name: "seam",
          redirect_uris: [REGISTERED],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "none",
          application_type: "native",
          scope: "agent:read mcp:agent offline_access",
        }),
      }),
    );
    expect(registration.status).toBe(201);
    const client = (await registration.json()) as { client_id: string };

    const { getPool } = await import("../src/db/pool");
    const row = await getPool().query(
      `select redirect_uris, jsonb_typeof(redirect_uris) as kind
         from ba_oauth_clients where client_id = $1`,
      [client.client_id],
    );
    // Pin the storage shape too: a regression here would otherwise surface as
    // an unexplained redirect mismatch further down.
    expect(row.rows[0]?.kind).toBe("array");
    expect(row.rows[0]?.redirect_uris).toEqual([REGISTERED]);

    const query = new URLSearchParams({
      response_type: "code",
      client_id: client.client_id,
      state: "x",
      code_challenge: "_7-J3DrZmBs-6kXpAED-8XNbgHW29PxP5f0yLT-OPBs",
      code_challenge_method: "S256",
      redirect_uri: AUTHORIZED,
      scope: "agent:read mcp:agent offline_access",
      resource: `${BASE}/v1/agent/mcp`,
    });
    const authorize = await auth.handler(
      new Request(`${BASE}/api/auth/oauth2/authorize?${query}`),
    );

    const location = authorize.headers.get("location") ?? "";
    expect(location).not.toContain("invalid_redirect");
    expect(location).toContain("/oauth/authorize");
  });
});
