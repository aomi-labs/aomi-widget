import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  readEnv,
  readGasPolicyEnv,
  isProviderConfigured,
  resolveDefaultProvider,
  ALCHEMY_API_KEY_ENVS,
  PIMLICO_API_KEY_ENVS,
} from "../src/aa/env";

const ORIGINAL_ENV = { ...process.env };

describe("AA env utilities", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ALCHEMY_API_KEY;
    delete process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    delete process.env.PIMLICO_API_KEY;
    delete process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    delete process.env.ALCHEMY_GAS_POLICY_ID;
    delete process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID;
    delete process.env.ALCHEMY_GAS_POLICY_ID_ETHEREUM;
    delete process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID_ETHEREUM;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("readEnv", () => {
    it("returns the first matching env var", () => {
      process.env.ALCHEMY_API_KEY = "key-1";
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "key-2";

      expect(readEnv(ALCHEMY_API_KEY_ENVS)).toBe("key-1");
    });

    it("skips empty/whitespace values", () => {
      process.env.ALCHEMY_API_KEY = "  ";
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "key-2";

      expect(readEnv(ALCHEMY_API_KEY_ENVS)).toBe("key-2");
    });

    it("returns undefined when nothing matches", () => {
      expect(readEnv(ALCHEMY_API_KEY_ENVS)).toBeUndefined();
    });

    it("respects publicOnly flag", () => {
      process.env.ALCHEMY_API_KEY = "private-key";
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "public-key";

      expect(readEnv(ALCHEMY_API_KEY_ENVS, { publicOnly: true })).toBe("public-key");
    });

    it("returns undefined when publicOnly and only private vars are set", () => {
      process.env.ALCHEMY_API_KEY = "private-key";

      expect(readEnv(ALCHEMY_API_KEY_ENVS, { publicOnly: true })).toBeUndefined();
    });
  });

  describe("readGasPolicyEnv", () => {
    it("prefers chain-specific env var", () => {
      process.env.ALCHEMY_GAS_POLICY_ID = "base-policy";
      process.env.ALCHEMY_GAS_POLICY_ID_ETHEREUM = "eth-policy";

      const result = readGasPolicyEnv(
        1,
        { 1: "ethereum" },
        ["ALCHEMY_GAS_POLICY_ID", "NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID"],
      );

      expect(result).toBe("eth-policy");
    });

    it("falls back to base candidate when chain-specific is not set", () => {
      process.env.ALCHEMY_GAS_POLICY_ID = "base-policy";

      const result = readGasPolicyEnv(
        1,
        { 1: "ethereum" },
        ["ALCHEMY_GAS_POLICY_ID", "NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID"],
      );

      expect(result).toBe("base-policy");
    });

    it("returns undefined when no slug and no base match", () => {
      expect(
        readGasPolicyEnv(
          999,
          {},
          ["ALCHEMY_GAS_POLICY_ID"],
        ),
      ).toBeUndefined();
    });
  });

  describe("isProviderConfigured", () => {
    it("detects alchemy when key is set", () => {
      process.env.ALCHEMY_API_KEY = "key";
      expect(isProviderConfigured("alchemy")).toBe(true);
    });

    it("detects pimlico when public key is set", () => {
      process.env.NEXT_PUBLIC_PIMLICO_API_KEY = "key";
      expect(isProviderConfigured("pimlico")).toBe(true);
    });

    it("returns false when nothing is configured", () => {
      expect(isProviderConfigured("alchemy")).toBe(false);
      expect(isProviderConfigured("pimlico")).toBe(false);
    });

    it("respects publicOnly flag", () => {
      process.env.ALCHEMY_API_KEY = "private-key";
      expect(isProviderConfigured("alchemy", { publicOnly: true })).toBe(false);

      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "public-key";
      expect(isProviderConfigured("alchemy", { publicOnly: true })).toBe(true);
    });
  });

  describe("resolveDefaultProvider", () => {
    it("prefers alchemy when both are configured", () => {
      process.env.ALCHEMY_API_KEY = "key";
      process.env.PIMLICO_API_KEY = "key";
      expect(resolveDefaultProvider()).toBe("alchemy");
    });

    it("falls back to pimlico", () => {
      process.env.PIMLICO_API_KEY = "key";
      expect(resolveDefaultProvider()).toBe("pimlico");
    });

    it("throws when neither is configured", () => {
      expect(() => resolveDefaultProvider()).toThrow("AA requires provider credentials");
    });
  });
});
