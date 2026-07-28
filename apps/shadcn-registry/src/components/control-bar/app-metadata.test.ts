import { describe, expect, it } from "vitest";
import { getAppInfo, groupAppsByCategory } from "./app-metadata";

describe("app-metadata", () => {
  it("handles non-string app ids without throwing", () => {
    const apps = [
      "default",
      undefined,
      null,
      123,
      "binance",
    ] as unknown as string[];

    expect(() => groupAppsByCategory(apps)).not.toThrow();

    const grouped = groupAppsByCategory(apps);
    const allIds = grouped.flatMap((group) => group.apps.map((app) => app.id));
    expect(allIds).toEqual(expect.arrayContaining(["binance", "default"]));
    expect(allIds).toHaveLength(2);
  });

  it("returns fallback metadata for empty app id", () => {
    const info = getAppInfo("" as unknown as string);
    expect(info.displayName).toBe("Unknown App");
    expect(info.abbr).toBe("?");
  });

  it("preserves hosted application ids while grouping", () => {
    const grouped = groupAppsByCategory([
      { name: "somm-agent", applicationId: 1641 },
    ]);

    expect(grouped[0]?.apps[0]).toMatchObject({
      id: "somm-agent",
      displayName: "Somm Agent",
      applicationId: 1641,
    });
  });
});
