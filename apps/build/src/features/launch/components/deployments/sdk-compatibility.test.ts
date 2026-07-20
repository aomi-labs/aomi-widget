import { describe, expect, it } from "vitest";
import { sdkCompatibility } from "./sdk-compatibility";

describe("sdkCompatibility", () => {
  it.each([
    ["3.0.3", "3.0.3", "current"],
    ["3.0.2", "3.0.3", "outdated"],
    [null, "3.0.3", "unknown"],
  ] as const)("classifies %s against %s as %s", (stamped, required, state) => {
    expect(sdkCompatibility(stamped, required)).toBe(state);
  });
});
