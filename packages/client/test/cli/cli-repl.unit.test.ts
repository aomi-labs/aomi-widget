import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  chatCommandMock,
  modelsCommandMock,
  setAppCommandMock,
  setModelCommandMock,
  saveProviderKeyCommandMock,
  showProviderKeysCommandMock,
  clearProviderKeysCommandMock,
} = vi.hoisted(() => ({
  chatCommandMock: vi.fn().mockResolvedValue(undefined),
  modelsCommandMock: vi.fn().mockResolvedValue(undefined),
  setAppCommandMock: vi.fn(),
  setModelCommandMock: vi.fn().mockResolvedValue(undefined),
  saveProviderKeyCommandMock: vi.fn().mockResolvedValue(undefined),
  showProviderKeysCommandMock: vi.fn().mockResolvedValue(undefined),
  clearProviderKeysCommandMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/cli/commands/chat", () => ({
  chatCommand: chatCommandMock,
}));

vi.mock("../../src/cli/commands/control", () => ({
  modelsCommand: modelsCommandMock,
  setAppCommand: setAppCommandMock,
  setModelCommand: setModelCommandMock,
}));

vi.mock("../../src/cli/commands/provider-keys", () => ({
  saveProviderKeyCommand: saveProviderKeyCommandMock,
  showProviderKeysCommand: showProviderKeysCommandMock,
  clearProviderKeysCommand: clearProviderKeysCommandMock,
}));

vi.mock("../../src/cli/cli-session", () => ({
  CliSession: {
    loadOrCreate: vi.fn(() => ({ model: "gpt-5-mini" })),
  },
}));

describe("CLI REPL command routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes plain text to chatCommand", async () => {
    const { handleReplLine } = await import("../../src/cli/repl");
    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      secrets: {},
    };

    await expect(handleReplLine(config, "hello", true)).resolves.toBe("continue");
    expect(chatCommandMock).toHaveBeenCalledWith(config, "hello", true);
  });

  it("updates the current app when /app is used", async () => {
    const { handleReplLine } = await import("../../src/cli/repl");
    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      secrets: {},
    };

    await handleReplLine(config, "/app khalani", false);

    expect(setAppCommandMock).toHaveBeenCalledWith(
      config,
      "khalani",
      { printLocation: false },
    );
    expect(config.app).toBe("khalani");
  });

  it("routes /model list and /model <rig>", async () => {
    const { handleReplLine } = await import("../../src/cli/repl");
    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      secrets: {},
    };

    await handleReplLine(config, "/model list", false);
    expect(modelsCommandMock).toHaveBeenCalledWith(config);

    await handleReplLine(config, "/model gpt-5", false);
    expect(setModelCommandMock).toHaveBeenCalledWith(
      config,
      "gpt-5",
      { printLocation: false },
    );
    expect(config.model).toBe("gpt-5");
  });

  it("routes /key commands to provider-key handlers", async () => {
    const { handleReplLine } = await import("../../src/cli/repl");
    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      secrets: {},
    };

    await handleReplLine(config, "/key anthropic:sk-ant", false);
    expect(saveProviderKeyCommandMock).toHaveBeenCalledWith(
      config,
      "anthropic:sk-ant",
      { printLocation: false },
    );

    await handleReplLine(config, "/key show", false);
    expect(showProviderKeysCommandMock).toHaveBeenCalledWith(
      config,
      { printLocation: false },
    );

    await handleReplLine(config, "/key clear", false);
    expect(clearProviderKeysCommandMock).toHaveBeenCalledWith(
      config,
      { printLocation: false },
    );
  });

  it("exits on :exit", async () => {
    const { handleReplLine } = await import("../../src/cli/repl");

    await expect(
      handleReplLine(
        {
          baseUrl: "https://api.aomi.dev",
          app: "default",
          secrets: {},
        },
        ":exit",
        false,
      ),
    ).resolves.toBe("exit");
  });
});
