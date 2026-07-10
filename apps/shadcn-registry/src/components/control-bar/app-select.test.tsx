import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AppSelect } from "./app-select";

const controlMocks = vi.hoisted(() => ({
  onAppSelect: vi.fn(),
}));

vi.mock("@aomi-labs/react", () => ({
  appIdentityKey: (descriptor: {
    name: string;
    applicationId?: number | string | null;
    platform?: string;
  }) => {
    if (descriptor.applicationId) return `application:${descriptor.applicationId}`;
    if (descriptor.platform) return `platform:${descriptor.platform}:${descriptor.name}`;
    return `name:${descriptor.name}`;
  },
  cn: (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" "),
  useAuthEndpoints: () => ({
    state: {
      appDescriptors: [
        { name: "default" },
        {
          name: "binance",
          applicationId: 2936606,
          platform: "community",
        },
      ],
      authorizedApps: ["default", "binance"],
      availableModels: [],
      defaultModel: null,
      defaultApp: "default",
    },
    actions: {
      getAuthorizedApps: vi.fn(),
      getAvailableModels: vi.fn(),
    },
  }),
  usePerThreadControl: () => ({
    isProcessing: false,
    actions: {
      getCurrentThreadApp: () => "default",
      getCurrentThreadApplicationId: () => null,
      onAppSelect: controlMocks.onAppSelect,
      getCurrentThreadControl: vi.fn(),
      getPreferredThreadControl: vi.fn(),
      onModelSelect: vi.fn(),
      markControlSynced: vi.fn(),
      syncCurrentThreadControl: vi.fn(),
    },
  }),
}));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  controlMocks.onAppSelect.mockClear();
});

describe("AppSelect", () => {
  it("selects descriptor-scoped hosted apps with their application id", async () => {
    render(<AppSelect />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Binance/i }));

    expect(controlMocks.onAppSelect).toHaveBeenCalledWith("binance", {
      applicationId: 2936606,
    });
  });
});
