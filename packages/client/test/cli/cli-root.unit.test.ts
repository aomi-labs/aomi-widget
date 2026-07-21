import { describe, expect, it } from "vitest";

import { hasRootSubcommand } from "../../src/cli/root";

describe("CLI root dispatch", () => {
  it("recognizes a subcommand after global options and their values", () => {
    expect(
      hasRootSubcommand([
        "--backend-url",
        "http://127.0.0.1:8080",
        "--account-bearer",
        "token",
        "tx",
        "sign",
        "tx-50",
      ]),
    ).toBe(true);
  });

  it("keeps root prompt mode when no subcommand is present", () => {
    expect(
      hasRootSubcommand([
        "--backend-url",
        "http://127.0.0.1:8080",
        "--prompt",
        "show my SOL balance",
      ]),
    ).toBe(false);
  });
});
