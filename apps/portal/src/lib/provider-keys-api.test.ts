import test from "node:test";
import assert from "node:assert/strict";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        return store.has(key) ? store.get(key) ?? null : null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    },
  });

  return store;
}

test("getOrCreateSettingsClientId reuses the persisted browser client id", async () => {
  installLocalStorage({
    aomi_client_id: "client-abc",
  });

  const moduleUrl = new URL("./provider-keys-api.ts", import.meta.url);
  const { getOrCreateSettingsClientId } = await import(moduleUrl.href);

  assert.equal(getOrCreateSettingsClientId(), "client-abc");
  assert.equal(globalThis.localStorage.getItem("aomi_client_id"), "client-abc");
});

test("bindProviderKeysSession associates the current settings session with the browser client id", async () => {
  installLocalStorage({
    aomi_client_id: "client-123",
  });

  const calls: FetchCall[] = [];
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return {
        ok: true,
        status: 200,
        text: async () => "{}",
        json: async () => ({}),
      } as Response;
    },
  });

  const moduleUrl = new URL("./provider-keys-api.ts", import.meta.url);
  const { bindProviderKeysSession } = await import(moduleUrl.href);

  await bindProviderKeysSession();

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/state\?client_id=client-123$/);
  assert.equal(new Headers(calls[0].init?.headers).has("X-Session-Id"), true);
});
