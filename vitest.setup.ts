import { webcrypto } from "node:crypto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(cleanup);

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// Node 25 exposes a stub globalThis.localStorage (via --localstorage-file) that
// lacks the standard Storage API (setItem / getItem / clear / removeItem / key /
// length). Install a real in-memory implementation so that tests relying on
// localStorage work correctly in the jsdom environment.
(function installLocalStorage() {
  let store: Map<string, string> | null = null;

  function ensureStore() {
    if (!store) store = new Map<string, string>();
    return store;
  }

  const impl = {
    getItem(key: string): string | null {
      return ensureStore().get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      ensureStore().set(key, value);
    },
    removeItem(key: string): void {
      ensureStore().delete(key);
    },
    clear(): void {
      ensureStore().clear();
    },
    key(index: number): string | null {
      return Array.from(ensureStore().keys())[index] ?? null;
    },
    get length(): number {
      return ensureStore().size;
    },
  };

  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: impl,
    });
  } catch {
    // Already sealed — skip polyfill.
  }
})();
