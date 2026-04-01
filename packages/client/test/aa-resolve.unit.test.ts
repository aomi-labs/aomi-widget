import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mainnet, polygon } from "viem/chains";

import { resolveAlchemyConfig, resolvePimlicoConfig } from "../src/aa/resolve";
import type { WalletExecutionCall } from "../src/aa/types";

const CALL_LIST: WalletExecutionCall[] = [
  { to: "0x1111111111111111111111111111111111111111", value: "1", chainId: 1 },
];

const POLYGON_CALLS: WalletExecutionCall[] = [
  { to: "0x1111111111111111111111111111111111111111", value: "1", chainId: 137 },
];

const ORIGINAL_ENV = { ...process.env };

describe("resolveAlchemyConfig", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ALCHEMY_API_KEY;
    delete process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    delete process.env.ALCHEMY_GAS_POLICY_ID;
    delete process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("resolves a complete Alchemy config", () => {
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.ALCHEMY_GAS_POLICY_ID = "policy-1";

    const result = resolveAlchemyConfig({
      calls: CALL_LIST,
      chainsById: { [mainnet.id]: mainnet },
    });

    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("alchemy-key");
    expect(result!.gasPolicyId).toBe("policy-1");
    expect(result!.plan.provider).toBe("alchemy");
    expect(result!.mode).toBe("7702"); // mainnet default
    expect(result!.chain.id).toBe(1);
  });

  it("returns null when calls is null", () => {
    process.env.ALCHEMY_API_KEY = "key";
    expect(resolveAlchemyConfig({ calls: null, chainsById: {} })).toBeNull();
  });

  it("returns null when localPrivateKey is provided", () => {
    process.env.ALCHEMY_API_KEY = "key";
    expect(
      resolveAlchemyConfig({
        calls: CALL_LIST,
        localPrivateKey: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        chainsById: { [mainnet.id]: mainnet },
      }),
    ).toBeNull();
  });

  it("returns null when API key is missing (default behavior)", () => {
    const result = resolveAlchemyConfig({
      calls: CALL_LIST,
      chainsById: { [mainnet.id]: mainnet },
    });
    expect(result).toBeNull();
  });

  it("throws when API key is missing and throwOnMissingConfig is true", () => {
    expect(() =>
      resolveAlchemyConfig({
        calls: CALL_LIST,
        chainsById: { [mainnet.id]: mainnet },
        throwOnMissingConfig: true,
      }),
    ).toThrow("Alchemy AA requires ALCHEMY_API_KEY");
  });

  it("applies modeOverride", () => {
    process.env.ALCHEMY_API_KEY = "key";

    const result = resolveAlchemyConfig({
      calls: CALL_LIST,
      chainsById: { [mainnet.id]: mainnet },
      modeOverride: "4337",
    });

    expect(result!.mode).toBe("4337");
    expect(result!.plan.mode).toBe("4337");
  });

  it("throws on unsupported modeOverride when throwOnMissingConfig", () => {
    process.env.ALCHEMY_API_KEY = "key";

    expect(() =>
      resolveAlchemyConfig({
        calls: CALL_LIST,
        chainsById: { [mainnet.id]: mainnet },
        modeOverride: "9999" as never,
        throwOnMissingConfig: true,
      }),
    ).toThrow("not supported");
  });

  it("respects publicOnly flag", () => {
    process.env.ALCHEMY_API_KEY = "private-key";

    expect(
      resolveAlchemyConfig({
        calls: CALL_LIST,
        chainsById: { [mainnet.id]: mainnet },
        publicOnly: true,
      }),
    ).toBeNull();

    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "public-key";

    const result = resolveAlchemyConfig({
      calls: CALL_LIST,
      chainsById: { [mainnet.id]: mainnet },
      publicOnly: true,
    });

    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("public-key");
  });

  it("uses pre-resolved Alchemy values", () => {
    const result = resolveAlchemyConfig({
      calls: CALL_LIST,
      chainsById: { [mainnet.id]: mainnet },
      apiKey: "pre-resolved-key",
      gasPolicyId: "pre-resolved-policy",
    });

    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("pre-resolved-key");
    expect(result!.gasPolicyId).toBe("pre-resolved-policy");
  });
});

describe("resolvePimlicoConfig", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PIMLICO_API_KEY;
    delete process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("resolves a complete Pimlico config", () => {
    process.env.PIMLICO_API_KEY = "pimlico-key";

    const result = resolvePimlicoConfig({
      calls: POLYGON_CALLS,
      chainsById: { [polygon.id]: polygon },
    });

    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("pimlico-key");
    expect(result!.plan.provider).toBe("pimlico");
    expect(result!.mode).toBe("4337"); // polygon default
  });

  it("returns null when API key is missing", () => {
    expect(
      resolvePimlicoConfig({
        calls: POLYGON_CALLS,
        chainsById: { [polygon.id]: polygon },
      }),
    ).toBeNull();
  });

  it("throws when throwOnMissingConfig and key is missing", () => {
    expect(() =>
      resolvePimlicoConfig({
        calls: POLYGON_CALLS,
        chainsById: { [polygon.id]: polygon },
        throwOnMissingConfig: true,
      }),
    ).toThrow("Pimlico AA requires PIMLICO_API_KEY");
  });

  it("passes through rpcUrl", () => {
    process.env.PIMLICO_API_KEY = "key";

    const result = resolvePimlicoConfig({
      calls: POLYGON_CALLS,
      chainsById: { [polygon.id]: polygon },
      rpcUrl: "https://custom-rpc.example",
    });

    expect(result!.rpcUrl).toBe("https://custom-rpc.example");
  });

  it("uses a pre-resolved API key", () => {
    const result = resolvePimlicoConfig({
      calls: POLYGON_CALLS,
      chainsById: { [polygon.id]: polygon },
      apiKey: "pre-resolved-key",
    });

    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("pre-resolved-key");
  });
});
