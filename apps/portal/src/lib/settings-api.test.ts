import test from "node:test";
import assert from "node:assert/strict";

type FetchCall = {
  url: string;
  headers: Headers;
};

function installLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
}

test("settingsApiFetch joins same-origin backend URLs as /api paths", async () => {
  const previousBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const previousFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_BACKEND_URL = "/";
  installLocalStorage();

  const calls: FetchCall[] = [];
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        headers: new Headers(init?.headers),
      });
      return Response.json({ ok: true });
    },
  });

  try {
    const moduleUrl = new URL("./settings-api.ts", import.meta.url);
    const { settingsApiFetch } = await import(moduleUrl.href);
    await settingsApiFetch("/api/account/apps");

    assert.equal(calls[0]?.url, "/api/account/apps");
    assert.match(
      calls[0]?.headers.get("X-Session-Id") ?? "",
      /^(settings-|[0-9a-f-]{36})/,
    );
  } finally {
    if (previousBackendUrl === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_URL;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_URL = previousBackendUrl;
    }
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: previousFetch,
    });
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});
