import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mainnet, polygon } from "viem/chains";

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

import { createAAProviderState } from "../src/aa/create";

const PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;
const SIGNER = { id: "external-wallet" } as const;
const PARA = { id: "para-session" } as const;
const CALL_LIST = [
  { to: "0x1111111111111111111111111111111111111111", value: "1", chainId: 1 },
] as const;
const POLYGON_CALLS = [
  { to: "0x1111111111111111111111111111111111111111", value: "1", chainId: 137 },
] as const;

const ORIGINAL_ENV = { ...process.env };

describe("createAAProviderState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createAlchemySmartAccountMock.mockReset();
    createPimlicoSmartAccountMock.mockReset();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ALCHEMY_API_KEY;
    delete process.env.PIMLICO_API_KEY;
    delete process.env.ALCHEMY_GAS_POLICY_ID;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("creates an Alchemy provider state", async () => {
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

    const state = await createAAProviderState({
      provider: "alchemy",
      chain: mainnet,
      owner: { privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      mode: "7702",
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

    expect(state.plan).toMatchObject({
      provider: "alchemy",
      mode: "7702",
      fallbackToEoa: false,
    });
    expect(state.AA).toMatchObject({
      provider: "ALCHEMY",
      mode: "7702",
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(state.error).toBeNull();
  });

  it("creates an unsponsored Alchemy provider state", async () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.ALCHEMY_GAS_POLICY_ID = "policy-1";

    createAlchemySmartAccountMock.mockResolvedValue({
      provider: "ALCHEMY",
      mode: "4337",
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      sendTransaction: vi.fn(),
      sendBatchTransaction: vi.fn(),
    });

    const state = await createAAProviderState({
      provider: "alchemy",
      chain: mainnet,
      owner: { privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      mode: "4337",
      sponsored: false,
    });

    expect(createAlchemySmartAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        gasPolicyId: undefined,
      }),
    );
    expect(state.plan).toMatchObject({
      sponsorship: "disabled",
    });
  });

  it("creates a Pimlico provider state", async () => {
    process.env.PIMLICO_API_KEY = "pimlico-key";

    createPimlicoSmartAccountMock.mockResolvedValue({
      provider: "PIMLICO",
      mode: "4337",
      smartAccountAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
      sendTransaction: vi.fn(),
      sendBatchTransaction: vi.fn(),
    });

    const state = await createAAProviderState({
      provider: "pimlico",
      chain: polygon,
      owner: { privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...POLYGON_CALLS],
      mode: "4337",
    });

    expect(createPimlicoSmartAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "pimlico-key",
        chain: polygon,
        mode: "4337",
      }),
    );

    expect(state.plan).toMatchObject({
      provider: "pimlico",
      mode: "4337",
    });
    expect(state.AA).toMatchObject({
      provider: "PIMLICO",
      AAAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
    });
    expect(state.error).toBeNull();
  });

  it("captures errors without throwing", async () => {
    process.env.ALCHEMY_API_KEY = "key";

    createAlchemySmartAccountMock.mockRejectedValue(new Error("SDK init failed"));

    const state = await createAAProviderState({
      provider: "alchemy",
      chain: mainnet,
      owner: { privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      mode: "7702",
    });

    expect(state.AA).toBeNull();
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error!.message).toBe("SDK init failed");
    expect(state.plan).not.toBeNull();
  });

  it("returns error state when smart account is null", async () => {
    process.env.ALCHEMY_API_KEY = "key";

    createAlchemySmartAccountMock.mockResolvedValue(null);

    const state = await createAAProviderState({
      provider: "alchemy",
      chain: mainnet,
      owner: { privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      mode: "7702",
    });

    expect(state.AA).toBeNull();
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error!.message).toContain("could not be initialized");
  });
});

describe("createAAProviderState owner modes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createAlchemySmartAccountMock.mockReset();
    createPimlicoSmartAccountMock.mockReset();
  });

  it("creates an Alchemy provider state for Para sessions", async () => {
    createAlchemySmartAccountMock.mockResolvedValue({
      provider: "ALCHEMY",
      mode: "7702",
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      sendTransaction: vi.fn(),
      sendBatchTransaction: vi.fn(),
    });

    const state = await createAAProviderState({
      provider: "alchemy",
      owner: { para: PARA, address: "0x1234567890123456789012345678901234567890" },
      chain: mainnet,
      callList: [...CALL_LIST],
      rpcUrl: "https://example-rpc.invalid",
      apiKey: "alchemy-key",
      gasPolicyId: "policy-1",
      mode: "7702",
    });

    expect(createAlchemySmartAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "alchemy-key",
        gasPolicyId: "policy-1",
        para: PARA,
        chain: mainnet,
        rpcUrl: "https://example-rpc.invalid",
        mode: "7702",
      }),
    );
    expect(state.AA).toMatchObject({
      provider: "ALCHEMY",
      mode: "7702",
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
  });

  it("creates a Pimlico provider state for an external signer", async () => {
    createPimlicoSmartAccountMock.mockResolvedValue({
      provider: "PIMLICO",
      mode: "4337",
      smartAccountAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
      sendTransaction: vi.fn(),
      sendBatchTransaction: vi.fn(),
    });

    const state = await createAAProviderState({
      provider: "pimlico",
      owner: { signer: SIGNER },
      chain: polygon,
      callList: [...POLYGON_CALLS],
      rpcUrl: "https://example-rpc.invalid",
      apiKey: "pimlico-key",
      mode: "4337",
    });

    expect(createPimlicoSmartAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "pimlico-key",
        signer: SIGNER,
        chain: polygon,
        rpcUrl: "https://example-rpc.invalid",
        mode: "4337",
      }),
    );
    expect(state.AA).toMatchObject({
      provider: "PIMLICO",
      mode: "4337",
      AAAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
    });
  });
});
