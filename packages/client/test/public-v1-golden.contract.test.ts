import { describe, expect, it } from "vitest";

import {
  goldenActions,
  goldenResults,
  guestStartTurn,
  mcpHumanHandoff,
} from "./fixtures/public-v1/golden";

describe("public v1 golden fixtures", () => {
  it("covers every action and signable payload lane", () => {
    expect(new Set(goldenActions.map((action) => action.type))).toEqual(
      new Set(["external_transaction", "signing_request"]),
    );
    expect(
      new Set(
        goldenActions.flatMap((action) =>
          "payloads" in action
            ? action.payloads.map((payload) => payload.kind)
            : [],
        ),
      ),
    ).toEqual(
      new Set([
        "evm_personal",
        "evm_typed_data",
        "svm_message",
        "svm_transaction",
      ]),
    );
    expect(
      goldenActions.some(
        (action) =>
          "executionKind" in action &&
          action.executionKind === "account_abstraction" &&
          action.broadcaster === "backend",
      ),
    ).toBe(true);
  });

  it("covers partial batches, signatures, signed transactions, and rejection", () => {
    expect(goldenResults.map((result) => result.status)).toEqual([
      "submitted",
      "signed",
      "signed",
      "rejected",
    ]);
    expect(goldenResults[0]).toMatchObject({
      legs: [{ status: "submitted" }, { status: "skipped" }],
    });
  });

  it("keeps guest admission and MCP human handoff on the public projection", () => {
    expect(guestStartTurn.session).toMatch(/^sess_/);
    expect(mcpHumanHandoff.actions).toHaveLength(1);
    expect(mcpHumanHandoff.actions[0].type).toBe("external_transaction");
  });
});
