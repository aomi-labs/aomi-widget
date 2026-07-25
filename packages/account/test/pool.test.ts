import { describe, expect, it } from "vitest";
import { resolveAccountPoolOptions } from "../src/db/pool";

describe("resolveAccountPoolOptions", () => {
  it("uses one short-lived connection per Vercel function instance", () => {
    expect(resolveAccountPoolOptions({ VERCEL: "1" })).toEqual({
      max: 1,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });
  });

  it("keeps the local and persistent-runtime pool defaults", () => {
    expect(resolveAccountPoolOptions({})).toEqual({
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  });
});
