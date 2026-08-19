import { describe, expect, it } from "vitest";

import { decodeApplicationId, encodeApplicationId } from "./application-id";

describe("public application ids", () => {
  it.each([
    [7n, "app_7"],
    [9n, "app_9"],
    [33n, "app_11"],
    [1336n, "app_19R"],
    [2670n, "app_2KE"],
    [24895n, "app_R9Z"],
    [2938378n, "app_2SNGA"],
    [2938430n, "app_2SNHY"],
    [9223372036854775807n, "app_7ZZZZZZZZZZZZ"],
  ])("round-trips %s as %s", (internal, external) => {
    expect(encodeApplicationId(internal)).toBe(external);
    expect(decodeApplicationId(external)).toBe(internal);
  });

  it.each([
    "app_0",
    "app_01",
    "app_i",
    "app_I",
    "app_L",
    "app_O",
    "app_U",
    "app_2snga",
    "application_9",
    "app_8000000000000",
  ])("rejects invalid or non-canonical value %s", (value) => {
    expect(() => decodeApplicationId(value)).toThrow();
  });

  it.each([0n, -1n, 9223372036854775808n])(
    "rejects out-of-range internal id %s",
    (value) => {
      expect(() => encodeApplicationId(value)).toThrow();
    },
  );
});
