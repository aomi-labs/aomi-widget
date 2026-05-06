import test from "node:test";
import assert from "node:assert/strict";

test("normalizeProviderKeys returns an empty object for missing state", async () => {
  const moduleUrl = new URL("./provider-keys-utils.ts", import.meta.url);
  const { normalizeProviderKeys } = await import(moduleUrl.href);

  assert.deepEqual(normalizeProviderKeys(undefined), {});
  assert.deepEqual(normalizeProviderKeys(null), {});
});

test("normalizeProviderKeys preserves valid provider key entries", async () => {
  const moduleUrl = new URL("./provider-keys-utils.ts", import.meta.url);
  const { normalizeProviderKeys } = await import(moduleUrl.href);

  assert.deepEqual(
    normalizeProviderKeys({
      openai: {
        apiKey: "sk-openai-123",
        keyPrefix: "sk-open",
        label: "Primary",
      },
    }),
    {
      openai: {
        apiKey: "sk-openai-123",
        keyPrefix: "sk-open",
        label: "Primary",
      },
    },
  );
});
