import { afterEach, describe, expect, it, vi } from "vitest";

const runMainMock = vi.fn();

vi.mock("citty", () => ({
  defineCommand: (input: unknown) => input,
  runMain: runMainMock,
}));

describe("runCli", () => {
  afterEach(() => {
    runMainMock.mockReset();
  });

  it("passes the provided argv through as rawArgs", async () => {
    const { runCli } = await import("../src/cli/main");

    await runCli(["node", "aomi", "secret", "add", "FOO=bar"]);

    expect(runMainMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rawArgs: ["secret", "add", "FOO=bar"],
      }),
    );
  });
});
