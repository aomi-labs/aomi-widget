import test from "node:test";
import assert from "node:assert/strict";

test("defaultUsageDateRange uses month-to-date in UTC", async () => {
  const moduleUrl = new URL("./usage-range.ts", import.meta.url);
  const { defaultUsageDateRange } = await import(moduleUrl.href);
  const now = new Date("2026-03-20T15:34:10.000Z");
  assert.deepEqual(defaultUsageDateRange(now), {
    fromDate: "2026-03-01",
    toDate: "2026-03-20",
  });
});
