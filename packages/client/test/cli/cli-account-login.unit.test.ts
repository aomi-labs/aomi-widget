import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const ORIGINAL_ENV = { ...process.env };

const baseConfig = {
  baseUrl: "http://unit.test",
  app: "byreal",
  execution: "eoa" as const,
  secrets: {},
};
const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

describe("aomi account login", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../../src/cli/device-auth");
    vi.doUnmock("../../src/cli/oauth-device-auth");
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-login-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("uses the account-first provider picker by default", async () => {
    const deviceLogin = vi.fn(async () => ({
      provider: "privy" as const,
      auth: {
        sessionToken: "account-session",
        expiresAt: Date.parse("2031-01-02T03:04:05.000Z"),
        origin: "http://unit.test",
        subject: "user-1",
      },
    }));
    vi.doMock("../../src/cli/device-auth", () => ({
      signInWithDeviceProvider: deviceLogin,
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    const { readState } = await import("../../src/cli/state");
    vi.spyOn(console, "log").mockImplementation(() => {});

    await accountLoginCommand(baseConfig);

    expect(deviceLogin).toHaveBeenCalledWith({
      baseUrl: "http://unit.test",
      provider: undefined,
    });
    expect(readState()?.auth).toMatchObject({
      sessionToken: "account-session",
      subject: "user-1",
    });
    expect(readState()?.oauthGrants).toBeUndefined();
  });

  it("acquires explicit subject-bound OAuth resources after account login", async () => {
    const oauthLogin = vi.fn(async (input: { resource: string }) => ({
      clientId: input.resource.endsWith("/v1/agent")
        ? "agent-client"
        : "pipeline-client",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.parse("2031-01-02T03:04:05.000Z"),
      resource: input.resource,
      scopes: input.resource.endsWith("/v1/agent")
        ? [
            "agent:read",
            "agent:write",
            "agent:actions:resolve",
            "payments:submit",
            "custody:delegate",
            "offline_access",
          ]
        : [
            "pipeline:catalog",
            "pipeline:execute",
            "payments:submit",
            "custody:delegate",
            "offline_access",
          ],
      tokenType: "Bearer" as const,
      issuer: "http://unit.test/api/auth",
      origin: "http://unit.test",
      subject: "user-1",
    }));
    vi.doMock("../../src/cli/oauth-device-auth", () => ({
      signInWithOAuthDevice: oauthLogin,
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const cli = CliSession.loadOrCreate(baseConfig);
    cli.setAuthSession({
      sessionToken: "account-session",
      expiresAt: Date.now() + 60_000,
      origin: "http://unit.test",
      subject: "user-1",
    });

    await accountLoginCommand(baseConfig, { resource: "all" });

    expect(oauthLogin).toHaveBeenCalledTimes(2);
    expect(oauthLogin.mock.calls.map(([input]) => input)).toEqual([
      {
        baseUrl: "http://unit.test",
        resource: "http://unit.test/v1/agent",
        scopes: [
          "agent:read",
          "agent:write",
          "agent:actions:resolve",
          "payments:submit",
          "custody:delegate",
          "offline_access",
        ],
        expectedSubject: "user-1",
        clientId: undefined,
      },
      {
        baseUrl: "http://unit.test",
        resource: "http://unit.test/v1/pipeline",
        scopes: [
          "pipeline:catalog",
          "pipeline:execute",
          "payments:submit",
          "custody:delegate",
          "offline_access",
        ],
        expectedSubject: "user-1",
        clientId: undefined,
      },
    ]);
    expect(Object.keys(readState()?.oauthGrants ?? {})).toEqual([
      "http://unit.test/v1/agent",
      "http://unit.test/v1/pipeline",
    ]);
    expect(logSpy).toHaveBeenCalledWith(
      "Authorized OAuth resources: agent, pipeline",
    );
  });

  it("logs in with a normalized provider before acquiring a normalized resource", async () => {
    const deviceLogin = vi.fn(async () => ({
      provider: "para" as const,
      auth: {
        sessionToken: "account-session",
        expiresAt: Date.now() + 60_000,
        origin: "http://unit.test",
        subject: "user-1",
      },
    }));
    const oauthLogin = vi.fn(
      async (input: { resource: string; scopes: string[] }) => ({
        clientId: "agent-client",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 60_000,
        resource: input.resource,
        scopes: input.scopes,
        tokenType: "Bearer" as const,
        issuer: "http://unit.test/api/auth",
        origin: "http://unit.test",
        subject: "user-1",
      }),
    );
    vi.doMock("../../src/cli/device-auth", () => ({
      signInWithDeviceProvider: deviceLogin,
    }));
    vi.doMock("../../src/cli/oauth-device-auth", () => ({
      signInWithOAuthDevice: oauthLogin,
      revokeCliOAuthGrant: vi.fn(),
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    vi.spyOn(console, "log").mockImplementation(() => {});

    await accountLoginCommand(baseConfig, {
      provider: " PARA ",
      resource: " AGENT ",
    });

    expect(deviceLogin).toHaveBeenCalledWith({
      baseUrl: "http://unit.test",
      provider: "para",
    });
    expect(oauthLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: "http://unit.test/v1/agent",
        expectedSubject: "user-1",
        scopes: expect.arrayContaining([
          "agent:actions:resolve",
          "payments:submit",
        ]),
      }),
    );
  });

  it.each([
    [
      "provider plus EVM key",
      { provider: "para", privateKeyFlag: true },
      { privateKey: TEST_PRIVATE_KEY },
    ],
    [
      "provider plus Solana key",
      { provider: "privy", solanaPrivateKeyFlag: true },
      { solanaPrivateKey: "solana-secret" },
    ],
    [
      "resource plus EVM key",
      { resource: "agent", privateKeyFlag: true },
      { privateKey: TEST_PRIVATE_KEY },
    ],
    [
      "resource plus Solana key",
      { resource: "pipeline", solanaPrivateKeyFlag: true },
      { solanaPrivateKey: "solana-secret" },
    ],
  ])(
    "rejects conflicting signing-key flags for %s",
    async (_name, options, config) => {
      const deviceLogin = vi.fn();
      const oauthLogin = vi.fn();
      vi.doMock("../../src/cli/device-auth", () => ({
        signInWithDeviceProvider: deviceLogin,
      }));
      vi.doMock("../../src/cli/oauth-device-auth", () => ({
        signInWithOAuthDevice: oauthLogin,
        revokeCliOAuthGrant: vi.fn(),
      }));
      const { accountLoginCommand } =
        await import("../../src/cli/commands/account");
      vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        accountLoginCommand({ ...baseConfig, ...config }, options),
      ).rejects.toMatchObject({ code: 1 });
      expect(deviceLogin).not.toHaveBeenCalled();
      expect(oauthLogin).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["provider and wallet", { provider: "para", wallet: true }],
    ["provider and Solana", { provider: "privy", solana: true }],
    ["wallet and Solana", { wallet: true, solana: true }],
    ["resource and wallet", { resource: "agent", wallet: true }],
    ["resource and Solana", { resource: "pipeline", solana: true }],
  ])("rejects conflicting login modes for %s", async (_name, options) => {
    const deviceLogin = vi.fn();
    vi.doMock("../../src/cli/device-auth", () => ({
      signInWithDeviceProvider: deviceLogin,
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      accountLoginCommand(baseConfig, options),
    ).rejects.toMatchObject({ code: 1 });
    expect(deviceLogin).not.toHaveBeenCalled();
  });

  it("rolls back only grants acquired by a failed all-resource attempt", async () => {
    const revokeGrant = vi.fn(async () => {});
    const oauthLogin = vi
      .fn()
      .mockResolvedValueOnce({
        clientId: "agent-client",
        accessToken: "new-agent-access",
        refreshToken: "new-agent-refresh",
        expiresAt: Date.now() + 60_000,
        resource: "http://unit.test/v1/agent",
        scopes: ["agent:read"],
        tokenType: "Bearer" as const,
        issuer: "http://unit.test/api/auth",
        origin: "http://unit.test",
        subject: "user-1",
      })
      .mockRejectedValueOnce(new Error("pipeline authorization failed"));
    vi.doMock("../../src/cli/oauth-device-auth", () => ({
      signInWithOAuthDevice: oauthLogin,
      revokeCliOAuthGrant: revokeGrant,
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");
    const cli = CliSession.loadOrCreate(baseConfig);
    cli.setAuthSession({
      sessionToken: "account-session",
      expiresAt: Date.now() + 60_000,
      origin: "http://unit.test",
      subject: "user-1",
    });
    const oldAgent = {
      clientId: "agent-client",
      accessToken: "old-agent-access",
      refreshToken: "old-agent-refresh",
      expiresAt: Date.now() + 60_000,
      resource: "http://unit.test/v1/agent" as const,
      scopes: ["agent:read"],
      tokenType: "Bearer" as const,
      issuer: "http://unit.test/api/auth",
      origin: "http://unit.test",
      subject: "user-1",
    };
    const oldPipeline = {
      ...oldAgent,
      clientId: "pipeline-client",
      accessToken: "old-pipeline-access",
      resource: "http://unit.test/v1/pipeline" as const,
      scopes: ["pipeline:catalog"],
    };
    cli.setOAuthGrants([oldAgent, oldPipeline]);

    await expect(
      accountLoginCommand(baseConfig, { resource: "all" }),
    ).rejects.toThrow("pipeline authorization failed");

    expect(revokeGrant).toHaveBeenCalledTimes(1);
    expect(revokeGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        grant: expect.objectContaining({ accessToken: "new-agent-access" }),
      }),
    );
    expect(readState()?.oauthGrants).toMatchObject({
      "http://unit.test/v1/agent": { accessToken: "old-agent-access" },
      "http://unit.test/v1/pipeline": {
        accessToken: "old-pipeline-access",
      },
    });
  });

  it("requires an account session before OAuth resource acquisition", async () => {
    const oauthLogin = vi.fn();
    vi.doMock("../../src/cli/oauth-device-auth", () => ({
      signInWithOAuthDevice: oauthLogin,
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      accountLoginCommand(baseConfig, { resource: "agent" }),
    ).rejects.toMatchObject({ code: 1 });
    expect(oauthLogin).not.toHaveBeenCalled();
  });

  it("rejects static bearer login because it is an exclusive auth mode", async () => {
    const deviceLogin = vi.fn();
    vi.doMock("../../src/cli/device-auth", () => ({
      signInWithDeviceProvider: deviceLogin,
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      accountLoginCommand({ ...baseConfig, accountBearer: "static-token" }),
    ).rejects.toMatchObject({ code: 1 });
    expect(deviceLogin).not.toHaveBeenCalled();
  });

  it("passes an explicit provider to device auth", async () => {
    const deviceLogin = vi.fn(async () => ({
      provider: "para" as const,
      auth: {
        sessionToken: "para-session",
        expiresAt: Date.parse("2031-01-02T03:04:05.000Z"),
        origin: "http://unit.test",
        subject: "user-1",
      },
    }));
    vi.doMock("../../src/cli/device-auth", () => ({
      signInWithDeviceProvider: deviceLogin,
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    vi.spyOn(console, "log").mockImplementation(() => {});

    await accountLoginCommand(baseConfig, { provider: "para" });

    expect(deviceLogin).toHaveBeenCalledWith({
      baseUrl: "http://unit.test",
      provider: "para",
    });
  });

  it("rejects an unknown device provider", async () => {
    const deviceLogin = vi.fn();
    vi.doMock("../../src/cli/device-auth", () => ({
      signInWithDeviceProvider: deviceLogin,
    }));
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      accountLoginCommand(baseConfig, { provider: "unknown" }),
    ).rejects.toMatchObject({ code: 1 });
    expect(deviceLogin).not.toHaveBeenCalled();
  });

  it("establishes an account session through BetterAuth SIWE", async () => {
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");

    const nativeFetch = vi.fn(async (url: string | URL | Request) => {
      const target = String(url);
      if (target.endsWith("/api/auth/siwe/nonce")) {
        return {
          ok: true,
          status: 200,
          json: vi.fn(async () => ({
            nonce: "abc123def456",
            domain: "chat.aomi.dev",
            uri: "https://chat.aomi.dev",
          })),
          headers: new Headers(),
        } as unknown as Response;
      }
      if (target.endsWith("/api/auth/siwe/verify")) {
        return {
          ok: true,
          status: 200,
          json: vi.fn(async () => ({
            ok: true,
            user_id: "canonical-user",
          })),
          headers: new Headers({ "set-auth-token": "session-123" }),
        } as unknown as Response;
      }
      if (target.endsWith("/v1/account")) {
        return {
          ok: true,
          status: 200,
          json: vi.fn(async () => ({
            session: {
              betterAuthUserId: "canonical-user",
              expiresAt: "2030-01-02T03:04:05.000Z",
            },
          })),
        } as unknown as Response;
      }
      throw new Error(`unexpected fetch: ${target}`);
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await accountLoginCommand(
        {
          ...baseConfig,
          baseUrl: "https://chat.aomi.dev",
          privateKey: TEST_PRIVATE_KEY,
        },
        { wallet: true },
      );

      expect(nativeFetch).toHaveBeenNthCalledWith(
        1,
        "https://chat.aomi.dev/api/auth/siwe/nonce",
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(String(nativeFetch.mock.calls[1]?.[0])).toBe(
        "https://chat.aomi.dev/api/auth/siwe/verify",
      );
      const verifyInit = nativeFetch.mock.calls[1]?.[1] as RequestInit;
      expect(new Headers(verifyInit.headers).get("Content-Type")).toBe(
        "application/json",
      );
      expect(new Headers(verifyInit.headers).get("Cookie")).toBeNull();
      expect(JSON.parse(verifyInit.body as string)).toEqual({
        message: expect.stringContaining("Nonce: abc123def456"),
        signature: expect.stringMatching(/^0x/),
      });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Signed in with 0x"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        "Session expires at 2030-01-02T03:04:05.000Z",
      );
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("requires an EVM private key", async () => {
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");

    const nativeFetch = vi.fn();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(
        accountLoginCommand(baseConfig, { noBrowser: true }),
      ).rejects.toMatchObject({
        code: 1,
      });
      expect(nativeFetch).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("establishes an account session through BetterAuth SIWS", async () => {
    const keypair = Keypair.generate();
    const secret = bs58.encode(keypair.secretKey);
    const { accountLoginCommand } =
      await import("../../src/cli/commands/account");
    const nativeFetch = vi.fn(async (url: string | URL | Request) => {
      const target = String(url);
      if (target.endsWith("/api/auth/siws/nonce")) {
        return Response.json({
          nonce: "siws-nonce",
          domain: "chat.aomi.dev",
          uri: "https://chat.aomi.dev",
        });
      }
      if (target.endsWith("/api/auth/siws/verify")) {
        return Response.json(
          { success: true, user: { id: "ba-svm-user" } },
          { headers: { "set-auth-token": "svm-session" } },
        );
      }
      if (target.endsWith("/v1/account")) {
        return Response.json({
          session: {
            betterAuthUserId: "ba-svm-user",
            expiresAt: "2030-01-02T03:04:05.000Z",
          },
        });
      }
      throw new Error(`unexpected fetch: ${target}`);
    });
    vi.stubGlobal("fetch", nativeFetch);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await accountLoginCommand(
      {
        ...baseConfig,
        baseUrl: "https://chat.aomi.dev",
        solanaPrivateKey: secret,
        svmCluster: "solana:devnet",
      },
      { solana: true },
    );

    expect(logSpy).toHaveBeenCalledWith(
      `Signed in with Solana wallet ${keypair.publicKey.toBase58()}`,
    );
  });
});
