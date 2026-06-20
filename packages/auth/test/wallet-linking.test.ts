// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  createWalletLinkNonce,
  verifyWalletLinkNonce,
  walletLinkMessageMatches,
} from "../src/service/wallet-linking";

const address = "0x1111111111111111111111111111111111111111";

describe("wallet link nonce", () => {
  it("is scoped to the configured auth domain", () => {
    const nonce = createWalletLinkNonce({
      userId: "user-1",
      address,
      chainId: 1,
      domain: "portal.aomi.dev",
      secret: "secret",
      now: 1_700_000_000_000,
      random: "fixed",
    });

    expect(
      verifyWalletLinkNonce({
        nonce,
        userId: "user-1",
        address,
        chainId: 1,
        domain: "portal.aomi.dev",
        secret: "secret",
        now: 1_700_000_001_000,
      }),
    ).toBe(true);
    expect(
      verifyWalletLinkNonce({
        nonce,
        userId: "user-1",
        address,
        chainId: 1,
        domain: "embedder.example.com",
        secret: "secret",
        now: 1_700_000_001_000,
      }),
    ).toBe(false);
  });

  it("requires the wallet-link message domain to match the auth domain", () => {
    const message = `portal.aomi.dev wants to link this wallet to your Aomi account:
${address}

URI: https://portal.aomi.dev
Chain ID: 1
Nonce: nonce`;

    expect(
      walletLinkMessageMatches({
        message,
        address,
        chainId: 1,
        nonce: "nonce",
        domain: "portal.aomi.dev",
      }),
    ).toBe(true);
    expect(
      walletLinkMessageMatches({
        message,
        address,
        chainId: 1,
        nonce: "nonce",
        domain: "embedder.example.com",
      }),
    ).toBe(false);
  });
});
