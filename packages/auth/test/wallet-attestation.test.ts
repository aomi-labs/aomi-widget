// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { AccountAuthEnv } from "../src/better-auth/env";
import { createDefaultWalletAttesters } from "../src/providers/default-wallet-attesters";
import {
  fetchAttestedWallets,
  type AttestedWallet,
  type WalletAttesterRegistry,
} from "../src/providers/wallet-attestation";

const EVM = "0x1111111111111111111111111111111111111111";

const baseEnv: AccountAuthEnv = {
  betterAuthSecret: "secret",
  betterAuthUrl: "http://localhost:3001",
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/aomi_auth",
  siweDomain: "localhost:3001",
  trustedOrigins: ["http://localhost:3001"],
};

describe("fetchAttestedWallets", () => {
  it("fetches wallets from a provider registry", async () => {
    const wallets: AttestedWallet[] = [
      {
        provider: "custom",
        providerWalletId: "w-1",
        family: "evm",
        address: EVM,
        chainScope: null,
      },
    ];
    const attester = vi.fn(async () => wallets);

    const result = await fetchAttestedWallets({
      request: {
        provider: "custom",
        subject: "provider-user",
        email: "user@example.com",
      },
      attesters: { custom: attester },
    });

    expect(result).toEqual(wallets);
    expect(attester).toHaveBeenCalledWith({
      subject: "provider-user",
      email: "user@example.com",
    });
  });

  it("returns null when no attester is registered", async () => {
    await expect(
      fetchAttestedWallets({
        request: { provider: "custom", subject: "provider-user" },
        attesters: {},
      }),
    ).resolves.toBeNull();
  });

  it("logs and returns null when the provider fetch fails", async () => {
    const error = new Error("provider down");
    const logger = { warn: vi.fn() };
    const attesters: WalletAttesterRegistry = {
      custom: async () => {
        throw error;
      },
    };

    await expect(
      fetchAttestedWallets({
        request: { provider: "custom", subject: "provider-user" },
        attesters,
        logger,
      }),
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("failed to list custom wallets"),
      error,
    );
  });
});

describe("createDefaultWalletAttesters", () => {
  it("only registers providers with server credentials", () => {
    expect(createDefaultWalletAttesters(baseEnv)).toEqual({});

    const privy = createDefaultWalletAttesters({
      ...baseEnv,
      privyAppId: "privy-app",
      privyAppSecret: "privy-secret",
    });
    expect(privy.privy).toEqual(expect.any(Function));
    expect(privy.para).toBeUndefined();

    const para = createDefaultWalletAttesters({
      ...baseEnv,
      paraApiKey: "para-secret",
    });
    expect(para.privy).toBeUndefined();
    expect(para.para).toEqual(expect.any(Function));
  });
});
