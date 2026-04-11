import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getPersistedAAApiKey,
  getPersistedAlchemyGasPolicyId,
  readAAConfig,
  setAAConfigValue,
  writeAAConfig,
} from "../src/cli/aa-config";

const ORIGINAL_ENV = { ...process.env };
let configDir: string;

describe("cli aa config", () => {
  beforeEach(() => {
    configDir = mkdtempSync(join(tmpdir(), "aomi-aa-config-"));
    process.env = {
      ...ORIGINAL_ENV,
      AOMI_CONFIG_DIR: configDir,
    };
  });

  afterEach(() => {
    rmSync(configDir, { recursive: true, force: true });
    process.env = { ...ORIGINAL_ENV };
  });

  it("stores provider credentials under provider-specific namespaces", () => {
    let config = setAAConfigValue({}, "provider", "alchemy");
    config = setAAConfigValue(config, "key", "alchemy-key");
    config = setAAConfigValue(config, "policy", "policy-1");
    config = setAAConfigValue(config, "pimlico-key", "pimlico-key");

    writeAAConfig(config);

    const stored = readAAConfig();
    expect(stored).toEqual({
      provider: "alchemy",
      providers: {
        alchemy: {
          apiKey: "alchemy-key",
          gasPolicyId: "policy-1",
        },
        pimlico: {
          apiKey: "pimlico-key",
        },
      },
    });
    expect(getPersistedAAApiKey(stored, "alchemy")).toBe("alchemy-key");
    expect(getPersistedAlchemyGasPolicyId(stored)).toBe("policy-1");
  });

  it("migrates the legacy flat config shape on read", () => {
    writeFileSync(
      join(configDir, "aa.json"),
      JSON.stringify(
        {
          provider: "alchemy",
          mode: "7702",
          alchemyApiKey: "legacy-alchemy",
          alchemyGasPolicyId: "legacy-policy",
          pimlicoApiKey: "legacy-pimlico",
          fallback: "none",
        },
        null,
        2,
      ) + "\n",
    );

    const stored = readAAConfig();

    expect(stored).toEqual({
      provider: "alchemy",
      mode: "7702",
      fallback: "none",
      providers: {
        alchemy: {
          apiKey: "legacy-alchemy",
          gasPolicyId: "legacy-policy",
        },
        pimlico: {
          apiKey: "legacy-pimlico",
        },
      },
    });
  });

  it("writes the normalized nested shape to disk", () => {
    writeAAConfig({
      provider: "pimlico",
      mode: "4337",
      providers: {
        pimlico: {
          apiKey: "persisted-pimlico",
        },
      },
    });

    const raw = JSON.parse(readFileSync(join(configDir, "aa.json"), "utf-8")) as {
      providers?: {
        pimlico?: {
          apiKey?: string;
        };
      };
    };

    expect(raw.providers?.pimlico?.apiKey).toBe("persisted-pimlico");
    expect(raw).not.toHaveProperty("pimlicoApiKey");
  });

  it("requires a default provider before using the generic key setter", () => {
    expect(() => setAAConfigValue({}, "key", "missing-provider")).toThrow(
      "No default provider set",
    );
  });
});
