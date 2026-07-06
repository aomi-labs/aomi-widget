import { describe, expect, it, vi } from "vitest";
import { planPromote, executePromote } from "../promote";

const records = {
  app: "my-bot",
  currentReleaseTag: "tag-c",
  records: [
    {
      deploymentId: "dep_c",
      releaseTag: "tag-c",
      actor: null,
      createdAt: 3,
      sdkVersion: "3.0.1",
      current: true,
    },
    {
      deploymentId: "dep_b",
      releaseTag: "tag-b",
      actor: null,
      createdAt: 2,
      sdkVersion: "3.0.1",
      current: false,
    },
    {
      deploymentId: "dep_a",
      releaseTag: "tag-a",
      actor: null,
      createdAt: 1,
      sdkVersion: "3.0.1",
      current: false,
    },
  ],
};

describe("planPromote", () => {
  it("picks the newest non-current release as the previous target", () => {
    const plan = planPromote(records);
    expect(plan.current?.deploymentId).toBe("dep_c");
    expect(plan.previous?.deploymentId).toBe("dep_b");
  });

  it("returns no previous target when only one release exists", () => {
    const plan = planPromote({
      ...records,
      records: [records.records[0]],
    });
    expect(plan.previous).toBeNull();
  });
});

describe("executePromote", () => {
  it("calls the deploy client with app scoping and smither actor", async () => {
    const promote = vi.fn(async () => ({
      ok: true,
      promote: {
        deploymentId: "dep_b",
        releaseTags: ["tag-b"],
        status: "promoted",
        activation: { status: "ok", apps: [] },
      },
    }));
    const result = await executePromote(
      { promote, listDeploymentRecords: vi.fn() } as never,
      { platform: "community", app: "my-bot", deploymentId: "dep_b" },
    );
    expect(promote).toHaveBeenCalledWith({
      platform: "community",
      deploymentId: "dep_b",
      apps: ["my-bot"],
      actor: "aomi-smither",
    });
    expect(result).toEqual({
      ok: true,
      releaseTags: ["tag-b"],
      status: "promoted",
    });
  });
});
