import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mainnet, polygon } from "viem/chains";

const {
  createAlchemySmartAccountMock,
  createPimlicoSmartAccountMock,
  createSmartWalletClientMock,
  createPermissionlessSmartAccountClientMock,
  createPimlicoClientMock,
  getUserOperationGasPriceMock,
  toSimpleSmartAccountMock,
  alchemyWalletTransportMock,
  requestAccountMock,
  sendCallsMock,
  waitForCallsStatusMock,
  signAuthorizationMock,
  sendTransactionMock,
  estimateGasMock,
  waitForTransactionReceiptMock,
} = vi.hoisted(() => ({
  createAlchemySmartAccountMock: vi.fn(),
  createPimlicoSmartAccountMock: vi.fn(),
  createSmartWalletClientMock: vi.fn(),
  createPermissionlessSmartAccountClientMock: vi.fn(),
  createPimlicoClientMock: vi.fn(),
  getUserOperationGasPriceMock: vi.fn().mockResolvedValue({
    fast: { maxFeePerGas: 1n, maxPriorityFeePerGas: 1n },
  }),
  toSimpleSmartAccountMock: vi.fn(),
  alchemyWalletTransportMock: vi.fn(() => ({ transport: "alchemy-wallet" })),
  requestAccountMock: vi.fn(),
  sendCallsMock: vi.fn(),
  waitForCallsStatusMock: vi.fn(),
  signAuthorizationMock: vi.fn().mockResolvedValue({ r: "0x1", s: "0x2", v: 27n }),
  sendTransactionMock: vi.fn().mockResolvedValue("0xmock7702hash"),
  estimateGasMock: vi.fn().mockResolvedValue(50000n),
  waitForTransactionReceiptMock: vi.fn().mockResolvedValue({ status: "success", gasUsed: 47000n }),
}));

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

vi.mock("permissionless", () => ({
  createSmartAccountClient: createPermissionlessSmartAccountClientMock,
}));

vi.mock("permissionless/accounts", () => ({
  toSimpleSmartAccount: toSimpleSmartAccountMock,
}));

vi.mock("permissionless/clients/pimlico", () => ({
  createPimlicoClient: createPimlicoClientMock,
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createWalletClient: vi.fn(() => ({
      signAuthorization: signAuthorizationMock,
      sendTransaction: sendTransactionMock,
    })),
    createPublicClient: vi.fn(() => ({
      estimateGas: estimateGasMock,
      waitForTransactionReceipt: waitForTransactionReceiptMock,
      getCode: vi.fn().mockResolvedValue("0x"),
    })),
  };
});

vi.mock("viem/experimental/erc7821", () => ({
  encodeExecuteData: vi.fn(() => "0xmockexecutedata"),
}));

import { createAAProviderState } from "../../src/aa/create";

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
    createSmartWalletClientMock.mockReset();
    createPermissionlessSmartAccountClientMock.mockReset();
    createPimlicoClientMock.mockReset();
    getUserOperationGasPriceMock.mockReset();
    toSimpleSmartAccountMock.mockReset();
    alchemyWalletTransportMock.mockClear();
    requestAccountMock.mockReset();
    sendCallsMock.mockReset();
    waitForCallsStatusMock.mockReset();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ALCHEMY_API_KEY;
    delete process.env.PIMLICO_API_KEY;
    delete process.env.ALCHEMY_GAS_POLICY_ID;
    createSmartWalletClientMock.mockReturnValue({
      requestAccount: requestAccountMock,
      sendCalls: sendCallsMock,
      waitForCallsStatus: waitForCallsStatusMock,
    });
    createPermissionlessSmartAccountClientMock.mockReturnValue({
      sendTransaction: vi.fn().mockResolvedValue("0xmockuserophash"),
    });
    createPimlicoClientMock.mockReturnValue({
      getUserOperationGasPrice: getUserOperationGasPriceMock,
    });
    getUserOperationGasPriceMock.mockResolvedValue({
      fast: { maxFeePerGas: 1n, maxPriorityFeePerGas: 1n },
    });
    toSimpleSmartAccountMock.mockResolvedValue({
      address: "0xcccccccccccccccccccccccccccccccccccccccc",
    });
    createAlchemySmartAccountMock.mockResolvedValue({
      provider: "ALCHEMY",
      mode: "7702",
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0x69007702764179f14F51cdce752f4f775d74E139",
      sendTransaction: vi.fn(),
      sendBatchTransaction: vi.fn(),
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("creates an Alchemy 7702 provider state via Wallets API for direct owners", async () => {
    process.env.ALCHEMY_GAS_POLICY_ID = "policy-7702";

    const state = await createAAProviderState({
      provider: "alchemy",
      chain: mainnet,
      owner: { kind: "direct", privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      mode: "7702",
      apiKey: "alchemy-key",
    });

    expect(createSmartWalletClientMock).toHaveBeenCalledTimes(1);
    expect(createSmartWalletClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymaster: { policyId: "policy-7702" },
      }),
    );
    expect(createAlchemySmartAccountMock).not.toHaveBeenCalled();

    expect(state.resolved).toMatchObject({
      provider: "alchemy",
      mode: "7702",
      fallbackToEoa: false,
    });
    expect(state.account).toMatchObject({
      provider: "alchemy",
      mode: "7702",
      AAAddress: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
      delegationAddress: "0x69007702764179f14F51cdce752f4f775d74E139",
    });
    expect(state.error).toBeNull();
  });

  it("creates an unsponsored Alchemy provider state", async () => {
    process.env.ALCHEMY_GAS_POLICY_ID = "policy-1";

    requestAccountMock.mockResolvedValue({
      address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      type: "json-rpc",
    });

    const state = await createAAProviderState({
      provider: "alchemy",
      chain: mainnet,
      owner: { kind: "direct", privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      mode: "4337",
      apiKey: "alchemy-key",
      sponsored: false,
    });

    expect(createSmartWalletClientMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        paymaster: expect.anything(),
      }),
    );
    expect(requestAccountMock).toHaveBeenCalledWith();
    expect(requestAccountMock).toHaveBeenCalledTimes(1);
    expect(state.resolved).toMatchObject({
      sponsorship: "disabled",
    });
    expect(state.account).toMatchObject({
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mode: "4337",
    });
  });

  it("creates a Pimlico provider state", async () => {
    process.env.PIMLICO_API_KEY = "pimlico-key";

    const state = await createAAProviderState({
      provider: "pimlico",
      chain: polygon,
      owner: { kind: "direct", privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...POLYGON_CALLS],
      mode: "4337",
    });

    expect(createPimlicoSmartAccountMock).not.toHaveBeenCalled();
    expect(createPimlicoClientMock).toHaveBeenCalledTimes(1);
    expect(createPermissionlessSmartAccountClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: polygon,
        paymaster: expect.any(Object),
      }),
    );
    expect(toSimpleSmartAccountMock).toHaveBeenCalledTimes(1);

    expect(state.resolved).toMatchObject({
      provider: "pimlico",
      mode: "4337",
    });
    expect(state.account).toMatchObject({
      provider: "pimlico",
      AAAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
    });
    expect(state.error).toBeNull();
  });

  it("captures errors without throwing", async () => {
    createSmartWalletClientMock.mockImplementation(() => {
      throw new Error("SDK init failed");
    });

    const state = await createAAProviderState({
      provider: "alchemy",
      chain: mainnet,
      owner: { kind: "direct", privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      mode: "4337",
      apiKey: "key",
    });

    expect(state.account).toBeNull();
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error!.message).toBe("SDK init failed");
    expect(state.resolved).not.toBeNull();
  });

  it("creates 7702 state with wallet-apis", async () => {
    const state = await createAAProviderState({
      provider: "alchemy",
      chain: mainnet,
      owner: { kind: "direct", privateKey: PRIVATE_KEY },
      rpcUrl: "https://example-rpc.invalid",
      callList: [...CALL_LIST],
      mode: "7702",
      apiKey: "key",
    });

    expect(createSmartWalletClientMock).toHaveBeenCalledTimes(1);
    expect(createAlchemySmartAccountMock).not.toHaveBeenCalled();
    expect(state.account).toMatchObject({
      provider: "alchemy",
      mode: "7702",
    });
    expect(state.error).toBeNull();
  });
});

describe("createAAProviderState owner modes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createAlchemySmartAccountMock.mockReset();
    createPimlicoSmartAccountMock.mockReset();
    createSmartWalletClientMock.mockReset();
    createPermissionlessSmartAccountClientMock.mockReset();
    createPimlicoClientMock.mockReset();
    getUserOperationGasPriceMock.mockReset();
    toSimpleSmartAccountMock.mockReset();
    alchemyWalletTransportMock.mockClear();
    requestAccountMock.mockReset();
    sendCallsMock.mockReset();
    waitForCallsStatusMock.mockReset();
    createSmartWalletClientMock.mockReturnValue({
      requestAccount: requestAccountMock,
      sendCalls: sendCallsMock,
      waitForCallsStatus: waitForCallsStatusMock,
    });
    createPermissionlessSmartAccountClientMock.mockReturnValue({
      sendTransaction: vi.fn().mockResolvedValue("0xmockuserophash"),
    });
    createPimlicoClientMock.mockReturnValue({
      getUserOperationGasPrice: getUserOperationGasPriceMock,
    });
    getUserOperationGasPriceMock.mockResolvedValue({
      fast: { maxFeePerGas: 1n, maxPriorityFeePerGas: 1n },
    });
    toSimpleSmartAccountMock.mockResolvedValue({
      address: "0xcccccccccccccccccccccccccccccccccccccccc",
    });
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
      owner: {
        kind: "session",
        adapter: "para",
        session: PARA,
        address: "0x1234567890123456789012345678901234567890",
      },
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
    expect(state.account).toMatchObject({
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
      owner: {
        kind: "session",
        adapter: "para",
        session: PARA,
        signer: SIGNER,
      },
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
    expect(state.account).toMatchObject({
      provider: "PIMLICO",
      mode: "4337",
      AAAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
    });
  });

  it("returns a stable error state for unsupported session adapters", async () => {
    const state = await createAAProviderState({
      provider: "alchemy",
      owner: {
        kind: "session",
        adapter: "privy",
        session: { id: "privy-session" },
      },
      chain: mainnet,
      callList: [...CALL_LIST],
      rpcUrl: "https://example-rpc.invalid",
      apiKey: "alchemy-key",
      gasPolicyId: "policy-1",
      mode: "4337",
    });

    expect(createAlchemySmartAccountMock).not.toHaveBeenCalled();
    expect(state.account).toBeNull();
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error!.message).toBe('Session adapter "privy" is not implemented.');
  });
});
