import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mainnet, polygon } from "viem/chains";
import { CliExit } from "../src/cli/errors";
import { writeAAConfig } from "../src/cli/aa-config";

const {
  createAlchemySmartAccountMock,
  createPimlicoSmartAccountMock,
  createSmartWalletClientMock,
  alchemyWalletTransportMock,
  sendCallsMock,
  waitForCallsStatusMock,
} = vi.hoisted(() => {
  const sendCallsMock = vi.fn().mockResolvedValue({ id: "mock-call-id" });
  const waitForCallsStatusMock = vi.fn().mockResolvedValue({
    status: "success",
    receipts: [{ transactionHash: "0xmockhash" }],
  });
  return {
    createAlchemySmartAccountMock: vi.fn(),
    createPimlicoSmartAccountMock: vi.fn(),
    createSmartWalletClientMock: vi.fn(() => ({
      sendCalls: sendCallsMock,
      waitForCallsStatus: waitForCallsStatusMock,
      requestAccount: vi.fn().mockResolvedValue({ address: "0xaaaa" }),
    })),
    alchemyWalletTransportMock: vi.fn(() => "mock-transport"),
    sendCallsMock,
    waitForCallsStatusMock,
  };
});

vi.mock("@getpara/aa-alchemy", () => ({
  createAlchemySmartAccount: createAlchemySmartAccountMock,
}));

vi.mock("@getpara/aa-pimlico", () => ({
  createPimlicoSmartAccount: createPimlicoSmartAccountMock,
}));

vi.mock("@alchemy/wallet-apis", () => ({
  createSmartWalletClient: createSmartWalletClientMock,
  alchemyWalletTransport: alchemyWalletTransportMock,
}));

import { buildCliConfig, getPositionals } from "../src/cli/commands/defs/shared";
import {
  createCliProviderState,
  describeExecutionDecision,
  getAlternativeAAMode,
  resolveCliExecutionDecision,
} from "../src/cli/execution";
import { isAlchemySponsorshipLimitError } from "../src/aa";

const PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;
const CALL_LIST = [
  {
    to: "0x1111111111111111111111111111111111111111",
    value: "1",
    chainId: 1,
  },
] as const;
const ERC20_TRANSFER_CALL_LIST = [
  {
    to: "0x2222222222222222222222222222222222222222",
    value: "0",
    data: "0xa9059cbb00000000000000000000000033333333333333333333333333333333333333330000000000000000000000000000000000000000000000000000000000000001",
    chainId: 137,
  },
] as const;

const ORIGINAL_ENV = { ...process.env };
let configDir: string;

describe("CLI execution controls", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createAlchemySmartAccountMock.mockReset();
    createPimlicoSmartAccountMock.mockReset();
    createSmartWalletClientMock.mockClear();
    alchemyWalletTransportMock.mockClear();
    sendCallsMock.mockClear();
    waitForCallsStatusMock.mockClear();
    // Re-apply default return values after clear
    sendCallsMock.mockResolvedValue({ id: "mock-call-id" });
    waitForCallsStatusMock.mockResolvedValue({
      status: "success",
      receipts: [{ transactionHash: "0xmockhash" }],
    });
    createSmartWalletClientMock.mockReturnValue({
      sendCalls: sendCallsMock,
      waitForCallsStatus: waitForCallsStatusMock,
      requestAccount: vi.fn().mockResolvedValue({ address: "0xaaaa" }),
    });
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AOMI_AA_PROVIDER;
    delete process.env.AOMI_AA_MODE;
    delete process.env.ALCHEMY_API_KEY;
    delete process.env.PIMLICO_API_KEY;
    delete process.env.ALCHEMY_GAS_POLICY_ID;
    configDir = mkdtempSync(join(tmpdir(), "aomi-cli-aa-"));
    process.env.AOMI_CONFIG_DIR = configDir;
  });

  afterEach(() => {
    rmSync(configDir, { recursive: true, force: true });
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults to undefined (auto-detect) when neither --aa nor --eoa is provided", () => {
    const config = buildCliConfig({});

    expect(config.execution).toBeUndefined();
  });

  it("parses --new-session for chat flows", () => {
    const config = buildCliConfig({ "new-session": true });

    expect(config.freshSession).toBe(true);
  });

  it("normalizes bare private keys by adding the 0x prefix", () => {
    const config = buildCliConfig({
      "private-key":
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    });

    expect(config.privateKey).toBe(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
  });

  it("reads the active chain from AOMI_CHAIN_ID", () => {
    process.env.AOMI_CHAIN_ID = "137";

    const config = buildCliConfig({});

    expect(config.chain).toBe(137);
  });

  it("accepts --eoa as an explicit override", () => {
    const config = buildCliConfig({ eoa: true });

    expect(config.execution).toBe("eoa");
  });

  it("treats empty AA env vars as unset for forced EOA execution", () => {
    process.env.AOMI_AA_PROVIDER = "";
    process.env.AOMI_AA_MODE = "";

    const config = buildCliConfig({ eoa: true });

    expect(config.execution).toBe("eoa");
    expect(config.aaProvider).toBeUndefined();
    expect(config.aaMode).toBeUndefined();
  });

  it("sets aa mode when --aa-provider is specified via flag", () => {
    const config = buildCliConfig({ "aa-provider": "alchemy" });

    expect(config.execution).toBe("aa");
    expect(config.aaProvider).toBe("alchemy");
  });

  it("errors when --aa and --eoa are both provided", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      buildCliConfig({ aa: true, eoa: true }),
    ).toThrow(CliExit);

    errorSpy.mockRestore();
  });

  it("accepts --aa flag", () => {
    const config = buildCliConfig({ aa: true });

    expect(config.execution).toBe("aa");
  });

  it("reads all parsed positionals from the current command context", () => {
    expect(
      getPositionals({
        _: ["tx-1", "tx-2"],
        aa: true,
      }),
    ).toEqual(["tx-1", "tx-2"]);
  });

  it("getPositionals preserves tx IDs after boolean flags", () => {
    // Simulates citty parsing `aomi tx sign --aa tx-1 tx-2`
    expect(
      getPositionals({
        _: ["tx-1", "tx-2"],
        aa: true,
        eoa: false,
      }),
    ).toEqual(["tx-1", "tx-2"]);
  });

  it("explicit --aa uses AA with configured provider", () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.PIMLICO_API_KEY = "pimlico-key";

    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "aa",
      },
      chain: mainnet,
      callList: [...CALL_LIST],
    });

    expect(decision).toEqual({
      execution: "aa",
      provider: "alchemy",
      aaMode: "7702",
    });
    expect(describeExecutionDecision(decision)).toBe(
      "aa (alchemy, 7702)",
    );
  });

  it("resolves explicit provider and mode selections", () => {
    process.env.PIMLICO_API_KEY = "pimlico-key";

    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "aa",
        aaProvider: "pimlico",
        aaMode: "4337",
      },
      chain: mainnet,
      callList: [...CALL_LIST],
    });

    expect(decision).toEqual({
      execution: "aa",
      provider: "pimlico",
      aaMode: "4337",
    });
  });

  it("auto-switches default 4337 ERC-20 calls to 7702 when supported", () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "aa",
        aaProvider: "alchemy",
      },
      chain: polygon,
      callList: [...ERC20_TRANSFER_CALL_LIST],
    });

    expect(decision).toEqual({
      execution: "aa",
      provider: "alchemy",
      aaMode: "7702",
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Switching to 7702"),
    );

    logSpy.mockRestore();
  });

  it("warns but preserves explicit 4337 mode for ERC-20 calls", () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "aa",
        aaProvider: "alchemy",
        aaMode: "4337",
      },
      chain: polygon,
      callList: [...ERC20_TRANSFER_CALL_LIST],
    });

    expect(decision).toEqual({
      execution: "aa",
      provider: "alchemy",
      aaMode: "4337",
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Tokens must be in the smart account"),
    );

    logSpy.mockRestore();
  });

  it("auto-detect uses AA when provider is configured (no flag)", () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";

    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        // execution: undefined — no --aa or --eoa flag
      },
      chain: mainnet,
      callList: [...CALL_LIST],
    });

    expect(decision).toEqual({
      execution: "aa",
      provider: "alchemy",
      aaMode: "7702",
    });
  });

  it("auto-detect falls back to EOA when no provider configured", () => {
    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        // execution: undefined, no providers
      },
      chain: mainnet,
      callList: [...CALL_LIST],
    });

    expect(decision).toEqual({ execution: "eoa" });
  });

  it("eoa mode returns EOA decision regardless of provider config", () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";

    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "eoa",
      },
      chain: mainnet,
      callList: [...CALL_LIST],
    });

    expect(decision).toEqual({ execution: "eoa" });
  });

  it("aa mode throws when no AA provider is configured", () => {
    expect(() =>
      resolveCliExecutionDecision({
        config: {
          baseUrl: "https://api.aomi.dev",
          app: "default",
          execution: "aa",
        },
        chain: mainnet,
        callList: [...CALL_LIST],
      }),
    ).toThrow("AA requires provider credentials");
  });

  it("uses persisted AA credentials when env vars are not set", () => {
    writeAAConfig({
      provider: "pimlico",
      mode: "4337",
      providers: {
        pimlico: {
          apiKey: "persisted-pimlico-key",
        },
      },
    });

    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "aa",
      },
      chain: mainnet,
      callList: [...CALL_LIST],
    });

    expect(decision).toEqual({
      execution: "aa",
      provider: "pimlico",
      aaMode: "4337",
    });
  });

  it("returns the disabled provider state when EOA is forced", async () => {
    const providerState = await createCliProviderState({
      decision: { execution: "eoa" },
      chain: mainnet,
      privateKey: PRIVATE_KEY,
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
    });

    expect(providerState.resolved).toBeNull();
    expect(providerState.account).toBeUndefined();
    expect(providerState.error).toBeNull();
  });

  it("creates an Alchemy AA provider state for CLI signing", async () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.ALCHEMY_GAS_POLICY_ID = "policy-1";

    const providerState = await createCliProviderState({
      decision: {
        execution: "aa",
        provider: "alchemy",
        aaMode: "7702",
      },
      chain: mainnet,
      privateKey: PRIVATE_KEY,
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
    });

    // CLI (direct key) now goes through @alchemy/wallet-apis
    expect(createSmartWalletClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: mainnet,
      }),
    );
    expect(alchemyWalletTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "alchemy-key" }),
    );
    expect(providerState.resolved).toMatchObject({
      provider: "alchemy",
      mode: "7702",
      fallbackToEoa: false,
    });
    expect(providerState.account).toBeTruthy();
    expect(providerState.error).toBeNull();
  });

  it("passes persisted Alchemy credentials into CLI AA state creation", async () => {
    writeAAConfig({
      provider: "alchemy",
      mode: "7702",
      providers: {
        alchemy: {
          apiKey: "persisted-alchemy-key",
          gasPolicyId: "persisted-policy",
        },
      },
    });

    const providerState = await createCliProviderState({
      decision: {
        execution: "aa",
        provider: "alchemy",
        aaMode: "7702",
      },
      chain: mainnet,
      privateKey: PRIVATE_KEY,
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
    });

    expect(alchemyWalletTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "persisted-alchemy-key" }),
    );
    expect(createSmartWalletClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymaster: { policyId: "persisted-policy" },
      }),
    );
    expect(providerState.error).toBeNull();
  });

  it("creates Alchemy AA provider state for 4337 mode", async () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.ALCHEMY_GAS_POLICY_ID = "policy-1";

    const providerState = await createCliProviderState({
      decision: {
        execution: "aa",
        provider: "alchemy",
        aaMode: "4337",
      },
      chain: mainnet,
      privateKey: PRIVATE_KEY,
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
    });

    // CLI (direct key) uses wallet-apis even for 4337
    expect(createSmartWalletClientMock).toHaveBeenCalled();
    expect(providerState.resolved).toMatchObject({
      provider: "alchemy",
      mode: "4337",
    });
  });

  it("detects Alchemy sponsorship limit errors", () => {
    expect(
      isAlchemySponsorshipLimitError(
        new Error(
          "This transaction’s USD cost will put your team over your gas sponsorship Limit.",
        ),
      ),
    ).toBe(true);

    expect(isAlchemySponsorshipLimitError(new Error("validation reverted"))).toBe(
      false,
    );
  });

  it("getAlternativeAAMode returns the opposite mode", () => {
    expect(
      getAlternativeAAMode({
        execution: "aa",
        provider: "alchemy",
        aaMode: "7702",
      }),
    ).toEqual({
      execution: "aa",
      provider: "alchemy",
      aaMode: "4337",
    });

    expect(
      getAlternativeAAMode({
        execution: "aa",
        provider: "pimlico",
        aaMode: "4337",
      }),
    ).toEqual({
      execution: "aa",
      provider: "pimlico",
      aaMode: "7702",
    });
  });

  it("getAlternativeAAMode returns null for EOA decisions", () => {
    expect(getAlternativeAAMode({ execution: "eoa" })).toBeNull();
  });
});
