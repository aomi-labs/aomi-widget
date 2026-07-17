import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CliExit } from "../../errors";
import { buildCliConfig } from "./shared";

const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945382d2f4831f4a7d6c8b7a3b3f0f5f5f5f5f";
const TEST_ADDRESS = "0xB38bb7608306F08c604b4f8a9794c9588959ff09";

describe("buildCliConfig", () => {
  beforeEach(() => {
    delete process.env.PRIVATE_KEY;
    delete process.env.AOMI_PUBLIC_KEY;
    delete process.env.AOMI_BACKEND_URL;
    delete process.env.AOMI_APP;
    delete process.env.AOMI_ACCOUNT_BEARER;
    delete process.env.AOMI_EMBEDDED_PROVIDER;
    delete process.env.AOMI_EMBEDDED_PROVIDER_TOKEN;
  });

  afterEach(() => {
    delete process.env.PRIVATE_KEY;
    delete process.env.AOMI_PUBLIC_KEY;
    delete process.env.AOMI_BACKEND_URL;
    delete process.env.AOMI_APP;
    delete process.env.AOMI_ACCOUNT_BEARER;
    delete process.env.AOMI_EMBEDDED_PROVIDER;
    delete process.env.AOMI_EMBEDDED_PROVIDER_TOKEN;
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
    const stderr = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() =>
      buildCliConfig({
        "private-key": TEST_PRIVATE_KEY,
        "public-key": "0x0000000000000000000000000000000000000001",
      }),
    ).toThrow(CliExit);

    expect(stderr).toHaveBeenCalled();
  });

  it("does not force default backend/app when neither args nor env provide them", () => {
    const config = buildCliConfig({});

    expect(config.baseUrl).toBeUndefined();
    expect(config.app).toBeUndefined();
  });

  it("reads backend/app overrides from environment", () => {
    process.env.AOMI_BACKEND_URL = "http://127.0.0.1:8080";
    process.env.AOMI_APP = "wallet";

    const config = buildCliConfig({});

    expect(config.baseUrl).toBe("http://127.0.0.1:8080");
    expect(config.app).toBe("wallet");
  });

  it("reads account bearer auth from args", () => {
    const config = buildCliConfig({
      "account-bearer": "bearer-123",
    });

    expect(config.accountBearer).toBe("bearer-123");
    expect(config.embeddedProvider).toBeUndefined();
    expect(config.embeddedProviderToken).toBeUndefined();
  });

  it("reads legacy account provider config from environment", () => {
    process.env.AOMI_EMBEDDED_PROVIDER = "privy";
    process.env.AOMI_EMBEDDED_PROVIDER_TOKEN = "privy-token";

    const config = buildCliConfig({});

    expect(config.embeddedProvider).toBe("privy");
    expect(config.embeddedProviderToken).toBe("privy-token");
    expect(config.accountBearer).toBeUndefined();
  });

  it("rejects partial account provider config", () => {
    const stderr = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() =>
      buildCliConfig({
        "embedded-provider": "privy",
      }),
    ).toThrow(CliExit);

    expect(stderr).toHaveBeenCalled();
  });

  it("rejects mixing account bearer and legacy provider config", () => {
    const stderr = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() =>
      buildCliConfig({
        "account-bearer": "bearer-123",
        "embedded-provider": "privy",
        "embedded-provider-token": "privy-token",
      }),
    ).toThrow(CliExit);

    expect(stderr).toHaveBeenCalled();
  });
});
