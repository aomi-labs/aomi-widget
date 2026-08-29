import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

import { resolveSvmAddressForChat } from "../../src/cli/commands/chat";

const keypair = Keypair.generate();
const secret = bs58.encode(keypair.secretKey);

describe("CLI chat wallet identity", () => {
  it("prefers the address derived from the private key", () => {
    expect(
      resolveSvmAddressForChat(
        "PersistedAddr11111111111111111111111111111",
        secret,
      ),
    ).toBe(keypair.publicKey.toBase58());
  });

  it("falls back to the persisted address without a key", () => {
    expect(
      resolveSvmAddressForChat(
        "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
        undefined,
      ),
    ).toBe("J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks");
  });

  it("returns undefined without either source", () => {
    expect(resolveSvmAddressForChat(undefined, undefined)).toBeUndefined();
  });
});
