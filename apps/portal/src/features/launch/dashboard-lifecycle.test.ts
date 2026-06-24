import { describe, expect, it } from "vitest";
import type { UserSource } from "@aomi-labs/deploy";
import {
  deploymentIdFromReleaseTag,
  lifecycleFromLaunchStatus,
  sourceLifecycle,
} from "./dashboard-lifecycle";

function source(patch: Partial<UserSource>): UserSource {
  return {
    id: 1,
    installationId: 123,
    repositoryId: 456,
    repositoryLink: "https://github.com/alice/bot",
    githubAccount: "alice",
    githubUserId: "42",
    boundPlatformId: 1,
    apps: [],
    ...patch,
  };
}

describe("sourceLifecycle", () => {
  it("treats active and loaded as live chat state", () => {
    const lifecycle = sourceLifecycle(
      source({
        apps: [
          {
            id: 10,
            name: "bot",
            label: "bot",
            isActive: true,
            isPublic: true,
            appSourceId: 1,
            appReleaseTag: "apps-123-bot-abc",
            targetTags: [],
            loaded: true,
          },
        ],
      }),
    );

    expect(lifecycle.kind).toBe("live");
    expect(lifecycle.chatApp).toBe("bot");
  });

  it("does not call active-but-unloaded apps live", () => {
    const lifecycle = sourceLifecycle(
      source({
        apps: [
          {
            id: 10,
            name: "bot",
            label: "bot",
            isActive: true,
            isPublic: true,
            appSourceId: 1,
            appReleaseTag: "apps-123-bot-abc",
            targetTags: [],
            loaded: false,
          },
        ],
      }),
    );

    expect(lifecycle.kind).toBe("activation_pending");
    expect(lifecycle.releaseTags).toEqual(["apps-123-bot-abc"]);
    expect(lifecycle.chatApp).toBeUndefined();
  });

  it("uses latest deployment state for build-ready cards and links", () => {
    const lifecycle = sourceLifecycle(
      source({
        latestDeployment: {
          deploymentId: "dep_1",
          state: "ready",
          deployBranch: "alice/bot/123/abc",
          platformRepo: "aomi-labs/community-apps",
          commitHash: "abc123",
          ciStatus: "passed",
          ciUrl: "https://github.com/aomi-labs/community-apps/actions/runs/1",
          releaseTags: ["apps-123-bot-abc"],
          apps: [{ name: "bot", releaseTag: "apps-123-bot-abc" }],
        },
      }),
    );

    expect(lifecycle.kind).toBe("build_ready");
    expect(lifecycle.branchUrl).toBe(
      "https://github.com/aomi-labs/community-apps/tree/alice%2Fbot%2F123%2Fabc",
    );
    expect(lifecycle.ciUrl).toContain("/actions/runs/1");
  });

  it("derives deployment ids from app release tags", () => {
    expect(
      deploymentIdFromReleaseTag(
        "apps-141780080-r0fd515d1d4-playground-example-8819f32c4399",
      ),
    ).toBe("dep_141780080_r0fd515d1d4_8819f32c4399");
  });

  it("turns skipped CI status into a failed lifecycle with links", () => {
    const current = sourceLifecycle(source({ repositoryLink: "alice/bot" }));
    const lifecycle = lifecycleFromLaunchStatus(current, {
      state: "failed",
      deployment: {
        id: "dep_1",
        platform: {
          repository: "aomi-labs/community-apps",
          sourceBranch: "alice/bot/123/abc",
          ciStatus: "pending",
          ciUrl:
            "https://github.com/aomi-labs/community-apps/actions?query=branch%3Aalice/bot/123/abc",
          apps: [
            {
              name: "bot",
              releaseTag: "apps-123-r1-bot-abc",
              target: "x86_64-unknown-linux-gnu",
            },
          ],
        },
      },
      releaseTags: ["apps-123-r1-bot-abc"],
      ci: {
        status: "skipped",
        url: "https://github.com/aomi-labs/community-apps/actions/runs/1",
      },
      message: 'Deploy bot completed with conclusion "skipped".',
    });

    expect(lifecycle.kind).toBe("failed");
    expect(lifecycle.statusLabel).toBe("CI skipped");
    expect(lifecycle.branchUrl).toContain("alice%2Fbot%2F123%2Fabc");
    expect(lifecycle.failureReport).toContain("skipped");
  });

  it("keeps backend-building status in progress even when GitHub CI has passed", () => {
    const current = sourceLifecycle(source({ repositoryLink: "alice/bot" }));
    const lifecycle = lifecycleFromLaunchStatus(current, {
      state: "building",
      deployment: {
        id: "dep_1",
        platform: {
          repository: "aomi-labs/community-apps",
          sourceBranch: "alice/bot/123/abc",
          apps: [{ name: "bot", releaseTag: "apps-123-r1-bot-abc" }],
        },
      },
      releaseTags: ["apps-123-r1-bot-abc"],
      ci: {
        status: "passed",
        url: "https://github.com/aomi-labs/community-apps/actions/runs/1",
      },
    });

    expect(lifecycle.kind).toBe("building");
    expect(lifecycle.statusLabel).toBe("Releasing");
    expect(lifecycle.progressPercent).toBe(70);
  });

  it("turns stale CI status into a failed lifecycle", () => {
    const current = sourceLifecycle(source({ repositoryLink: "alice/bot" }));
    const lifecycle = lifecycleFromLaunchStatus(current, {
      state: "failed",
      deployment: {
        id: "dep_1",
        platform: {
          repository: "aomi-labs/community-apps",
          sourceBranch: "alice/bot/123/abc",
          apps: [{ name: "bot", releaseTag: "apps-123-r1-bot-abc" }],
        },
      },
      releaseTags: ["apps-123-r1-bot-abc"],
      ci: {
        status: "stale",
        url: "https://github.com/aomi-labs/community-apps/actions/runs/1",
      },
      message:
        'Deploy bot completed with conclusion "success" on stale commit abc123; deployment commit def456 has no matching Aomi CI run.',
    });

    expect(lifecycle.kind).toBe("failed");
    expect(lifecycle.statusLabel).toBe("CI stale");
    expect(lifecycle.progressLabel).toBe("CI stale");
    expect(lifecycle.failureReport).toContain("deployment commit def456");
  });
});
