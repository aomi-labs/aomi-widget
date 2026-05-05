import test from "node:test";
import assert from "node:assert/strict";

test("buildAppsRequest omits public_key when an API key is present", async () => {
  const moduleUrl = new URL("./app-select-path.ts", import.meta.url);
  const { buildAppsRequest } = await import(moduleUrl.href);

  assert.deepEqual(
    buildAppsRequest("0xabc", "  aomi-secret  "),
    {
      path: "/api/control/apps",
      apiKey: "aomi-secret",
    },
  );
});

test("buildAppsRequest includes public_key when no API key is present", async () => {
  const moduleUrl = new URL("./app-select-path.ts", import.meta.url);
  const { buildAppsRequest } = await import(moduleUrl.href);

  assert.deepEqual(
    buildAppsRequest("0xabc", null),
    {
      path: "/api/control/apps?public_key=0xabc",
      apiKey: null,
    },
  );
});

test("buildAppsRequest falls back to the base endpoint without identity or API key", async () => {
  const moduleUrl = new URL("./app-select-path.ts", import.meta.url);
  const { buildAppsRequest } = await import(moduleUrl.href);

  assert.deepEqual(
    buildAppsRequest(undefined, ""),
    {
      path: "/api/control/apps",
      apiKey: null,
    },
  );
});
