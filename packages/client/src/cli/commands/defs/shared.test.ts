import { afterEach, describe, expect, it, vi } from "vitest";
import { CliExit } from "../../errors";
import { buildCliConfig } from "./shared";

const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945382d2f4831f4a7d6c8b7a3b3f0f5f5f5f5f";
const TEST_ADDRESS = "0xB38bb7608306F08c604b4f8a9794c9588959ff09";

describe("buildCliConfig", () => {
  afterEach(() => {
    delete process.env.PRIVATE_KEY;
    delete process.env.AOMI_PUBLIC_KEY;
    vi.restoreAllMocks();
  });

  it("derives the public key from the private key when none is provided", () => {
    const config = buildCliConfig({
      "private-key": TEST_PRIVATE_KEY,
    });

    expect(config.privateKey).toBe(TEST_PRIVATE_KEY);
    expect(config.publicKey).toBe(TEST_ADDRESS);
  });

  it("fails when the provided public key mismatches the derived signer address", () => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      buildCliConfig({
        "private-key": TEST_PRIVATE_KEY,
        "public-key": "0x0000000000000000000000000000000000000001",
      }),
    ).toThrow(CliExit);

    expect(stderr).toHaveBeenCalled();
  });
});
