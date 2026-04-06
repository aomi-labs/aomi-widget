import { beforeEach, describe, expect, it, vi } from "vitest";

const readStateMock = vi.fn();
const printDataFileLocationMock = vi.fn();
const getOrCreateSessionMock = vi.fn();

vi.mock("../src/cli/state", () => ({
  readState: readStateMock,
  writeState: vi.fn(),
}));

vi.mock("../src/cli/output", () => ({
  printDataFileLocation: printDataFileLocationMock,
}));

vi.mock("../src/cli/context", () => ({
  getOrCreateSession: getOrCreateSessionMock,
  ingestSecretsIfPresent: vi.fn(),
}));

import { secretCommand } from "../src/cli/commands/secrets";

describe("CLI secrets command", () => {
  beforeEach(() => {
    readStateMock.mockReset();
    printDataFileLocationMock.mockReset();
    getOrCreateSessionMock.mockReset();
    vi.restoreAllMocks();
  });

  it("does not create a session when clearing secrets without an active session", async () => {
    readStateMock.mockReturnValue(null);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await secretCommand({
      parsed: {
        command: "secret",
        positional: ["clear"],
        flags: {},
        secretAssignments: [],
      },
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "auto",
        secrets: {},
      },
    });

    expect(getOrCreateSessionMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("No active session");
    expect(printDataFileLocationMock).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
