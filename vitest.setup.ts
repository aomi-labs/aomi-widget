import { webcrypto } from "node:crypto";
import "@testing-library/jest-dom";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}
