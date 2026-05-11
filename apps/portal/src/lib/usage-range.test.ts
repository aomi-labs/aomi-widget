// @vitest-environment node
import { describe, expect, it } from "vitest";
import { defaultUsageDateRange } from "./usage-range";

describe("defaultUsageDateRange", () => {
  it("uses month-to-date in UTC", () => {
    const now = new Date("2026-03-20T15:34:10.000Z");
    expect(defaultUsageDateRange(now)).toEqual({
      fromDate: "2026-03-01",
      toDate: "2026-03-20",
    });
  });
});
