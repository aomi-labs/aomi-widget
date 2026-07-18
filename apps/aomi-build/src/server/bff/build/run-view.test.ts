import { describe, expect, it } from "vitest";

import {
  curationFromOutputs,
  runStatusFromView,
  stageStatusesFromView,
} from "./run-view";

const fold = (nodeId: string) =>
  nodeId === "app:validate" || nodeId === "app:fix"
    ? "app:validate-loop"
    : nodeId;

function node(nodeId: string, state: string, updatedAtMs = 0) {
  return { nodeId, state, updatedAtMs };
}

describe("runStatusFromView", () => {
  it("maps store statuses onto wire statuses", () => {
    expect(runStatusFromView("finished")).toBe("completed");
    expect(runStatusFromView("continued")).toBe("completed");
    expect(runStatusFromView("cancelled")).toBe("failed");
    expect(runStatusFromView("waiting-approval")).toBe("waiting-approval");
    expect(runStatusFromView("waiting-timer")).toBe("running");
    expect(runStatusFromView(null)).toBeNull();
  });
});

describe("stageStatusesFromView", () => {
  it("derives stage statuses from durable node states", () => {
    const merged = stageStatusesFromView(
      {
        status: "running",
        nodes: [
          node("app:binaries", "finished"),
          node("app:codegen", "finished"),
          node("app:curate", "running"),
        ],
      },
      fold,
      {},
    );
    expect(merged).toMatchObject({
      "app:binaries": "complete",
      "app:codegen": "complete",
      "app:curate": "running",
    });
  });

  it("folds loop body nodes onto the loop stage, most advanced wins", () => {
    const merged = stageStatusesFromView(
      {
        status: "running",
        nodes: [node("app:validate", "finished"), node("app:fix", "running")],
      },
      fold,
      {},
    );
    // A later repair round runs while the validate row is finished — the
    // folded stage should not regress below the strongest durable signal.
    expect(merged["app:validate-loop"]).toBe("complete");
  });

  it("settles running/waiting rows when the run finished (replays)", () => {
    const merged = stageStatusesFromView(
      { status: "finished", nodes: [node("app:curate", "running")] },
      fold,
      { "app:result": "running" },
    );
    expect(merged["app:curate"]).toBe("complete");
    expect(merged["app:result"]).toBe("complete");
  });

  it("keeps live-only signals the store has not written yet", () => {
    const merged = stageStatusesFromView(
      { status: "running", nodes: [] },
      fold,
      { "app:binaries": "running" },
    );
    expect(merged["app:binaries"]).toBe("running");
  });
});

describe("curationFromOutputs", () => {
  it("reads the curation row and stringifies optional fields", () => {
    expect(
      curationFromOutputs({
        curation: [{ summary: "did things", changedFiles: "", followUps: "next" }],
      }),
    ).toEqual({ summary: "did things", changedFiles: "", followUps: "next" });
    expect(curationFromOutputs({})).toBeUndefined();
  });
});
