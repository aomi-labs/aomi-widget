import test from "node:test";
import assert from "node:assert/strict";

test("resolveAppsApiKey prefers the next api key when present", async () => {
  const moduleUrl = new URL("./app-select-api-key.ts", import.meta.url);
  const { resolveAppsApiKey } = await import(moduleUrl.href);

  assert.equal(resolveAppsApiKey("current-key", "  next-key  "), "next-key");
});

test("resolveAppsApiKey falls back to the current api key", async () => {
  const moduleUrl = new URL("./app-select-api-key.ts", import.meta.url);
  const { resolveAppsApiKey } = await import(moduleUrl.href);

  assert.equal(resolveAppsApiKey("  current-key  ", null), "current-key");
});

test("resolveAppsApiKey returns null when neither key is set", async () => {
  const moduleUrl = new URL("./app-select-api-key.ts", import.meta.url);
  const { resolveAppsApiKey } = await import(moduleUrl.href);

  assert.equal(resolveAppsApiKey(undefined, ""), null);
});
