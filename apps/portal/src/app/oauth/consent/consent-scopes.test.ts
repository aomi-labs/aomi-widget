import { describe, expect, it } from "vitest";
import { consentScopes } from "./consent-scopes";

describe("consentScopes", () => {
  it("preserves server-approved guest action and execution scopes", () => {
    expect(
      consentScopes(["agent:actions:resolve", "pipeline:execute"]),
    ).toEqual(["agent:actions:resolve", "pipeline:execute"]);
  });
});
