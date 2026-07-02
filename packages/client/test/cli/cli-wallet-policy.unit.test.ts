import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const baseConfig = {
  baseUrl: "http://unit.test",
  app: "default",
  execution: "eoa" as const,
  secrets: {},
};

const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945382d2f4831f4a7d6c8b7a3b3f0f5f5f5f5f";
const WALLET = "0x1111111111111111111111111111111111111111";

const WALLETS_FIXTURE = [
  {
    address: "0xAaaa00000000000000000000000000000000aaaa",
    chain_type: "evm",
    wallet_provider: "privy",
    signing: "delegated",
    is_primary: true,
    signing_mode: "autonomous",
    has_delegated_grant: true,
    can_use_autonomous: true,
    expires_at: 1_800_000_000,
  },
  {
    address: "0xBbbb00000000000000000000000000000000bbbb",
    chain_type: "evm",
    wallet_provider: "local",
    signing: "client",
    is_primary: false,
    signing_mode: "human_sync",
    has_delegated_grant: false,
    can_use_autonomous: false,
  },
  {
    address: "So11111111111111111111111111111111111111112",
    chain_type: "svm",
    wallet_provider: "privy",
    signing: "delegated",
    is_primary: true,
    signing_mode: "denied",
    has_delegated_grant: true,
    can_use_autonomous: true,
  },
];

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn(async () => payload),
    text: vi.fn(async () => JSON.stringify(payload)),
  } as unknown as Response;
}

function errorResponse(status: number, code: string): Response {
  return {
    ok: false,
    status,
    statusText: "Error",
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn(async () => ({ error: code })),
    text: vi.fn(async () => JSON.stringify({ error: code })),
  } as unknown as Response;
}

const CHALLENGE_PAYLOAD = {
  permit: {
    account: "user-1",
    chain_type: "evm",
    wallet: WALLET,
    mode: "autonomous",
    version: 3,
    expiry: 1_800_000_000,
  },
  typed_data: {
    domain: { name: "Aomi Signing Authorization", version: "1" },
    types: {
      SigningAuthorization: [
        { name: "account", type: "string" },
        { name: "chain_type", type: "string" },
        { name: "wallet", type: "string" },
        { name: "mode", type: "string" },
        { name: "version", type: "uint64" },
        { name: "expiry", type: "uint64" },
      ],
    },
    primaryType: "SigningAuthorization",
    message: {
      account: "user-1",
      chain_type: "evm",
      wallet: WALLET,
      mode: "autonomous",
      version: 3,
      expiry: 1_800_000_000,
    },
  },
};

describe("aomi wallet ls", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-wallet-ls-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders one row per key with mode, grant, capability, and primary columns", async () => {
    const { walletLsCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );

    const nativeFetch = vi.fn(async () =>
      jsonResponse({ wallets: WALLETS_FIXTURE }),
    );
    vi.stubGlobal("fetch", nativeFetch);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await walletLsCommand(baseConfig);

    expect(String(nativeFetch.mock.calls[0]?.[0])).toBe(
      "http://unit.test/api/account/wallets",
    );

    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines[0]).toBe("Wallets: 3");
    const header = lines[1];
    for (const column of [
      "address",
      "chain",
      "provider",
      "mode",
      "grant",
      "autonomous_ok",
      "primary",
    ]) {
      expect(header).toContain(column);
    }

    const rowA = lines.find((line) => line.includes("0xAaaa"));
    expect(rowA).toBeDefined();
    expect(rowA).toContain("evm");
    expect(rowA).toContain("privy");
    expect(rowA).toContain("autonomous");
    expect(rowA).toContain("[32m"); // autonomous renders green
    expect(rowA).toContain("✓ until 2027-01-15");
    expect(rowA).toContain("yes");

    const rowB = lines.find((line) => line.includes("0xBbbb"));
    expect(rowB).toContain("human_sync");
    expect(rowB).toContain("[33m"); // human_sync renders yellow
    expect(rowB).toContain("✗");
    expect(rowB).toContain("no");

    const rowC = lines.find((line) => line.includes("So1111"));
    expect(rowC).toContain("svm");
    expect(rowC).toContain("denied");
    expect(rowC).toContain("[31m"); // denied renders red
  });

  it("filters client-side with --provider", async () => {
    const { walletLsCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ wallets: WALLETS_FIXTURE })),
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await walletLsCommand(baseConfig, { provider: "privy" });

    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines[0]).toBe("Wallets: 2 (provider: privy)");
    expect(lines.some((line) => line.includes("0xAaaa"))).toBe(true);
    expect(lines.some((line) => line.includes("0xBbbb"))).toBe(false);
  });
});

describe("aomi wallet set-mode", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-set-mode-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("runs challenge → local viem signature → commit", async () => {
    const { setWalletModeCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );

    const nativeFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(CHALLENGE_PAYLOAD))
      .mockResolvedValueOnce(
        jsonResponse({
          address: WALLET,
          chain_type: "evm",
          signing_mode: "autonomous",
          authorization_version: 4,
        }),
      );
    vi.stubGlobal("fetch", nativeFetch);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await setWalletModeCommand(baseConfig, {
      address: WALLET,
      mode: "autonomous",
      localKey: TEST_PRIVATE_KEY,
    });

    expect(String(nativeFetch.mock.calls[0]?.[0])).toBe(
      "http://unit.test/api/account/authorization/challenge",
    );
    expect(
      JSON.parse(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).body as string,
      ),
    ).toEqual({ chain_type: "evm", wallet: WALLET, mode: "autonomous" });

    expect(String(nativeFetch.mock.calls[1]?.[0])).toBe(
      "http://unit.test/api/account/authorization/commit",
    );
    const commitBody = JSON.parse(
      (nativeFetch.mock.calls[1]?.[1] as RequestInit).body as string,
    ) as { permit: unknown; signature: string };
    expect(commitBody.permit).toEqual(CHALLENGE_PAYLOAD.permit);
    expect(commitBody.signature).toMatch(/^0x[0-9a-f]{130}$/);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("signing_mode → autonomous"),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("authorization v4"),
    );
  });

  it("falls back to the stored dev key when --local-key is absent", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { setWalletModeCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );

    CliSession.loadOrCreate({ ...baseConfig, privateKey: TEST_PRIVATE_KEY });

    const nativeFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(CHALLENGE_PAYLOAD))
      .mockResolvedValueOnce(
        jsonResponse({
          address: WALLET,
          chain_type: "evm",
          signing_mode: "autonomous",
          authorization_version: 4,
        }),
      );
    vi.stubGlobal("fetch", nativeFetch);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await setWalletModeCommand(baseConfig, {
      address: WALLET,
      mode: "autonomous",
    });

    expect(nativeFetch).toHaveBeenCalledTimes(2);
  });

  it("errors clearly when no signing key is available", async () => {
    const { setWalletModeCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );
    const { CliExit } = await import("../../src/cli/errors");

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      setWalletModeCommand(baseConfig, {
        address: WALLET,
        mode: "denied",
      }),
    ).rejects.toBeInstanceOf(CliExit);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("No key to sign the permit with"),
    );
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("aomi wallet dev-key"),
    );
  });

  it("maps missing_delegated_grant to the provider-login hint", async () => {
    const { setWalletModeCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );
    const { CliExit } = await import("../../src/cli/errors");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(409, "missing_delegated_grant")),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      setWalletModeCommand(baseConfig, {
        address: WALLET,
        mode: "autonomous",
        localKey: TEST_PRIVATE_KEY,
      }),
    ).rejects.toBeInstanceOf(CliExit);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("No delegated grant for this wallet"),
    );
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("aomi login --provider privy"),
    );
  });

  it("maps stale_permit to a re-run hint", async () => {
    const { setWalletModeCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );
    const { CliExit } = await import("../../src/cli/errors");

    const nativeFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(CHALLENGE_PAYLOAD))
      .mockResolvedValueOnce(errorResponse(409, "stale_permit"));
    vi.stubGlobal("fetch", nativeFetch);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      setWalletModeCommand(baseConfig, {
        address: WALLET,
        mode: "autonomous",
        localKey: TEST_PRIVATE_KEY,
      }),
    ).rejects.toBeInstanceOf(CliExit);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "changed this wallet's authorization concurrently",
      ),
    );
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("re-run"));
  });

  it("maps mode_illegal_for_provider to the provenance explanation", async () => {
    const { setWalletModeCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );
    const { CliExit } = await import("../../src/cli/errors");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(422, "mode_illegal_for_provider")),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      setWalletModeCommand(baseConfig, {
        address: WALLET,
        mode: "autonomous",
        localKey: TEST_PRIVATE_KEY,
      }),
    ).rejects.toBeInstanceOf(CliExit);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("privy-provenanced wallet"),
    );
  });

  it("explains that grants need the wallet's own key on 403 wrong_signer", async () => {
    const { setWalletModeCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );
    const { CliExit } = await import("../../src/cli/errors");

    const nativeFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(CHALLENGE_PAYLOAD))
      .mockResolvedValueOnce(errorResponse(403, "wrong_signer"));
    vi.stubGlobal("fetch", nativeFetch);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      setWalletModeCommand(baseConfig, {
        address: WALLET,
        mode: "autonomous",
        localKey: TEST_PRIVATE_KEY,
      }),
    ).rejects.toBeInstanceOf(CliExit);
    const messages = errSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((m) => m.includes("rejected the permit signature"))).toBe(
      true,
    );
    expect(
      messages.some((m) => m.includes("signed by the wallet's own key")),
    ).toBe(true);
  });

  it("rejects an unknown mode with usage", async () => {
    const { setWalletModeCommand } = await import(
      "../../src/cli/commands/wallet-policy"
    );
    const { CliExit } = await import("../../src/cli/errors");

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      setWalletModeCommand(baseConfig, {
        address: WALLET,
        mode: "sometimes",
        localKey: TEST_PRIVATE_KEY,
      }),
    ).rejects.toBeInstanceOf(CliExit);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("autonomous|human_sync|denied"),
    );
  });
});
