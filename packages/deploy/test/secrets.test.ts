import { describe, expect, it } from "vitest";
import { missingRequiredSecrets, type SecretSlot } from "../src/secrets";

const slot = (name: string, required: boolean): SecretSlot => ({
  name,
  description: `${name} description`,
  required,
});

describe("missingRequiredSecrets", () => {
  it("returns required slots that have no configured key", () => {
    const missing = missingRequiredSecrets(
      [slot("BINANCE_API_KEY", true), slot("BINANCE_SECRET_KEY", true)],
      ["BINANCE_API_KEY"],
    );
    expect(missing.map((s) => s.name)).toEqual(["BINANCE_SECRET_KEY"]);
  });

  it("never gates on optional slots", () => {
    expect(missingRequiredSecrets([slot("DEBUG", false)], [])).toEqual([]);
  });

  it("returns nothing when every required slot is configured", () => {
    expect(missingRequiredSecrets([slot("A", true)], ["A"])).toEqual([]);
  });

  it("treats undefined or empty slots as no gate", () => {
    expect(missingRequiredSecrets(undefined, [])).toEqual([]);
    expect(missingRequiredSecrets([], [])).toEqual([]);
  });

  it("matches names case-sensitively (env vars are case-sensitive)", () => {
    const missing = missingRequiredSecrets([slot("API_KEY", true)], ["api_key"]);
    expect(missing.map((s) => s.name)).toEqual(["API_KEY"]);
  });
});
