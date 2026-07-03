import { describe, expect, it } from "vitest";
import { buildDeploymentList } from "./deployment-timeline";

describe("buildDeploymentList", () => {
  it("returns [] for null", () => {
    expect(buildDeploymentList(null)).toEqual([]);
  });

  it("groups multi-app deploys by deployment id and decodes the commit", () => {
    const rows = buildDeploymentList({
      api: [
        {
          deploymentId: "dep_555_r0123abcdef_aaaaaaaaaaaa",
          releaseTag: "apps-555-r0123abcdef-api-aaaaaaaaaaaa",
          action: "activate",
          actor: "alice",
          createdAt: 10,
          current: true,
        },
      ],
      web: [
        {
          deploymentId: "dep_555_r0123abcdef_aaaaaaaaaaaa",
          releaseTag: "apps-555-r0123abcdef-web-aaaaaaaaaaaa",
          action: "activate",
          actor: "alice",
          createdAt: 10,
          current: false,
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].apps.sort()).toEqual(["api", "web"]);
    expect(rows[0].releaseTags).toHaveLength(2);
    expect(rows[0].commit).toBe("aaaaaaaaaaaa");
    // current is true if any app is live
    expect(rows[0].current).toBe(true);
  });

  it("sorts newest-first and carries the latest action/actor", () => {
    const rows = buildDeploymentList({
      api: [
        {
          deploymentId: "dep_1_ra_new0",
          releaseTag: "t-new",
          action: "rollback",
          actor: "bob",
          createdAt: 20,
          current: true,
        },
        {
          deploymentId: "dep_1_ra_old0",
          releaseTag: "t-old",
          action: "activate",
          actor: "alice",
          createdAt: 5,
          current: false,
        },
      ],
    });
    expect(rows.map((r) => r.deploymentId)).toEqual([
      "dep_1_ra_new0",
      "dep_1_ra_old0",
    ]);
    expect(rows[0].lastAction).toBe("rollback");
    expect(rows[0].actor).toBe("bob");
  });
});
