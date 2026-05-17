import { beforeEach, describe, expect, it, vi } from "vitest";
import { CliExit } from "../../src/cli/errors";

const {
  fetchStateMock,
  listProviderKeysMock,
  saveProviderKeyMock,
  deleteProviderKeyMock,
  loadOrCreateMock,
  ensureClientIdMock,
} = vi.hoisted(() => ({
  fetchStateMock: vi.fn().mockResolvedValue({}),
  listProviderKeysMock: vi.fn().mockResolvedValue([]),
  saveProviderKeyMock: vi.fn().mockResolvedValue({
    provider: "anthropic",
    key_prefix: "sk-ant-",
    label: null,
    is_active: true,
  }),
  deleteProviderKeyMock: vi.fn().mockResolvedValue(true),
  ensureClientIdMock: vi.fn(() => "client-1"),
  loadOrCreateMock: vi.fn(),
}));

vi.mock("../../src/client", () => ({
  AomiClient: vi.fn(() => ({
    fetchState: fetchStateMock,
    listProviderKeys: listProviderKeysMock,
    saveProviderKey: saveProviderKeyMock,
    deleteProviderKey: deleteProviderKeyMock,
  })),
}));

vi.mock("../../src/cli/cli-session", () => ({
  CliSession: {
    loadOrCreate: loadOrCreateMock,
  },
}));

describe("CLI provider-key commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadOrCreateMock.mockReturnValue({
      baseUrl: "https://api.aomi.dev",
      apiKey: undefined,
      sessionId: "session-1",
      ensureClientId: ensureClientIdMock,
    });
    fetchStateMock.mockResolvedValue({});
    listProviderKeysMock.mockResolvedValue([]);
    saveProviderKeyMock.mockResolvedValue({
      provider: "anthropic",
      key_prefix: "sk-ant-",
      label: null,
      is_active: true,
    });
    deleteProviderKeyMock.mockResolvedValue(true);
  });

  it("saves a provider key after binding the client to the session", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { saveProviderKeyCommand } = await import(
      "../../src/cli/commands/provider-keys"
    );

    await saveProviderKeyCommand(
      {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        secrets: {},
      },
      "anthropic:sk-ant-test",
      { printLocation: false },
    );

    expect(fetchStateMock).toHaveBeenCalledWith("session-1", undefined, "client-1");
    expect(saveProviderKeyMock).toHaveBeenCalledWith(
      "session-1",
      "anthropic",
      "sk-ant-test",
    );
    expect(logSpy).toHaveBeenCalledWith("BYOK key set for anthropic: sk-ant-...");
    logSpy.mockRestore();
  });

  it("shows configured provider keys", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    listProviderKeysMock.mockResolvedValue([
      {
        provider: "openai",
        key_prefix: "sk-open",
        label: null,
        is_active: true,
      },
    ]);

    const { showProviderKeysCommand } = await import(
      "../../src/cli/commands/provider-keys"
    );

    await showProviderKeysCommand(
      {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        secrets: {},
      },
      { printLocation: false },
    );

    expect(listProviderKeysMock).toHaveBeenCalledWith("session-1");
    expect(logSpy).toHaveBeenCalledWith("  openai: sk-open...");
    logSpy.mockRestore();
  });

  it("clears all configured provider keys", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    listProviderKeysMock.mockResolvedValue([
      {
        provider: "anthropic",
        key_prefix: "sk-ant-",
        label: null,
        is_active: true,
      },
      {
        provider: "openai",
        key_prefix: "sk-open",
        label: null,
        is_active: true,
      },
    ]);

    const { clearProviderKeysCommand } = await import(
      "../../src/cli/commands/provider-keys"
    );

    await clearProviderKeysCommand(
      {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        secrets: {},
      },
      { printLocation: false },
    );

    expect(deleteProviderKeyMock).toHaveBeenNthCalledWith(1, "session-1", "anthropic");
    expect(deleteProviderKeyMock).toHaveBeenNthCalledWith(2, "session-1", "openai");
    expect(logSpy).toHaveBeenCalledWith("BYOK provider keys cleared. Using system keys.");
    logSpy.mockRestore();
  });

  it("rejects invalid provider-key input", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { saveProviderKeyCommand } = await import(
      "../../src/cli/commands/provider-keys"
    );

    await expect(
      saveProviderKeyCommand(
        {
          baseUrl: "https://api.aomi.dev",
          app: "default",
          secrets: {},
        },
        "bad-format",
        { printLocation: false },
      ),
    ).rejects.toBeInstanceOf(CliExit);

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
