import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mainnet } from "viem/chains";
import { CliExit } from "../src/cli/errors";

const {
  createAlchemySmartAccountMock,
  createPimlicoSmartAccountMock,
} = vi.hoisted(() => ({
  createAlchemySmartAccountMock: vi.fn(),
  createPimlicoSmartAccountMock: vi.fn(),
}));

vi.mock("@getpara/aa-alchemy", () => ({
  createAlchemySmartAccount: createAlchemySmartAccountMock,
}));

vi.mock("@getpara/aa-pimlico", () => ({
  createPimlicoSmartAccount: createPimlicoSmartAccountMock,
}));

import { getConfig, parseArgs } from "../src/cli/args";
import {
  createCliProviderState,
  describeExecutionDecision,
  isAlchemySponsorshipLimitError,
  resolveCliExecutionDecision,
} from "../src/cli/execution";

const PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;
const CALL_LIST = [
  {
    to: "0x1111111111111111111111111111111111111111",
    value: "1",
    chainId: 1,
  },
] as const;

const ORIGINAL_ENV = { ...process.env };

describe("CLI execution controls", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createAlchemySmartAccountMock.mockReset();
    createPimlicoSmartAccountMock.mockReset();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AOMI_AA_PROVIDER;
    delete process.env.AOMI_AA_MODE;
    delete process.env.ALCHEMY_API_KEY;
    delete process.env.PIMLICO_API_KEY;
    delete process.env.ALCHEMY_GAS_POLICY_ID;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults to auto mode when neither --aa nor --eoa is provided", () => {
    const config = getConfig({
      command: "sign",
      positional: [],
      flags: {},
    });

    expect(config.execution).toBe("auto");
  });

  it("treats -V as a short flag instead of a command", () => {
    const parsed = parseArgs(["node", "aomi", "-V"]);

    expect(parsed.command).toBeUndefined();
    expect(parsed.flags["V"]).toBe("true");
  });

  it("accepts --eoa as an explicit override", () => {
    const config = getConfig({
      command: "sign",
      positional: [],
      flags: { eoa: "true" },
    });

    expect(config.execution).toBe("eoa");
  });

  it("treats empty AA env vars as unset for forced EOA execution", () => {
    process.env.AOMI_AA_PROVIDER = "";
    process.env.AOMI_AA_MODE = "";

    const config = getConfig({
      command: "sign",
      positional: [],
      flags: { eoa: "true" },
    });

    expect(config.execution).toBe("eoa");
    expect(config.aaProvider).toBeUndefined();
    expect(config.aaMode).toBeUndefined();
  });

  it("keeps auto mode while honoring AA provider preferences from env", () => {
    process.env.AOMI_AA_PROVIDER = "alchemy";

    const config = getConfig({
      command: "sign",
      positional: [],
      flags: {},
    });

    expect(config.execution).toBe("auto");
    expect(config.aaProvider).toBe("alchemy");
  });

  it("errors when --aa and --eoa are both provided", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      getConfig({
        command: "sign",
        positional: [],
        flags: { aa: "true", eoa: "true" },
      }),
    ).toThrow(CliExit);

    errorSpy.mockRestore();
  });

  it("errors when AA flags are used outside `aomi sign`", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      getConfig({
        command: "tx",
        positional: [],
        flags: { aa: "true" },
      }),
    ).toThrow(CliExit);

    errorSpy.mockRestore();
  });

  it("auto mode prefers AA and preserves an EOA fallback", () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.PIMLICO_API_KEY = "pimlico-key";

    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "auto",
      },
      chain: mainnet,
      callList: [...CALL_LIST],
    });

    expect(decision).toEqual({
      execution: "aa",
      provider: "alchemy",
      aaMode: "7702",
      fallbackToEoa: true,
    });
    expect(describeExecutionDecision(decision)).toBe(
      "aa (alchemy, 7702; fallback: eoa)",
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
      fallbackToEoa: false,
    });
  });

  it("auto mode falls back to direct EOA when no AA provider is configured", () => {
    const decision = resolveCliExecutionDecision({
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "auto",
      },
      chain: mainnet,
      callList: [...CALL_LIST],
    });

    expect(decision).toEqual({ execution: "eoa" });
  });

  it("returns the disabled provider state when EOA is forced", async () => {
    const providerState = await createCliProviderState({
      decision: { execution: "eoa" },
      chain: mainnet,
      privateKey: PRIVATE_KEY,
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
    });

    expect(providerState.plan).toBeNull();
    expect(providerState.AA).toBeUndefined();
    expect(providerState.error).toBeNull();
  });

  it("creates an Alchemy AA provider state for CLI signing", async () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.ALCHEMY_GAS_POLICY_ID = "policy-1";
    createAlchemySmartAccountMock.mockResolvedValue({
      provider: "ALCHEMY",
      mode: "7702",
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      sendTransaction: vi.fn(),
      sendBatchTransaction: vi.fn(),
    });

    const providerState = await createCliProviderState({
      decision: {
        execution: "aa",
        provider: "alchemy",
        aaMode: "7702",
        fallbackToEoa: false,
      },
      chain: mainnet,
      privateKey: PRIVATE_KEY,
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
    });

    expect(createAlchemySmartAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "alchemy-key",
        gasPolicyId: "policy-1",
        chain: mainnet,
        rpcUrl: "https://example-rpc.invalid",
        mode: "7702",
      }),
    );
    expect(providerState.plan).toMatchObject({
      provider: "alchemy",
      mode: "7702",
      fallbackToEoa: false,
    });
    expect(providerState.AA).toMatchObject({
      provider: "ALCHEMY",
      mode: "7702",
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(providerState.error).toBeNull();
  });

  it("can build an unsponsored Alchemy AA provider state", async () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.ALCHEMY_GAS_POLICY_ID = "policy-1";
    createAlchemySmartAccountMock.mockResolvedValue({
      provider: "ALCHEMY",
      mode: "4337",
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      sendTransaction: vi.fn(),
      sendBatchTransaction: vi.fn(),
    });

    const providerState = await createCliProviderState({
      decision: {
        execution: "aa",
        provider: "alchemy",
        aaMode: "4337",
        fallbackToEoa: false,
      },
      chain: mainnet,
      privateKey: PRIVATE_KEY,
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      sponsored: false,
    });

    expect(createAlchemySmartAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        gasPolicyId: undefined,
        mode: "4337",
      }),
    );
    expect(providerState.plan).toMatchObject({
      provider: "alchemy",
      mode: "4337",
      sponsorship: "disabled",
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
});
