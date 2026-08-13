import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A tiny external store so the mocked `useParaStatus` can flip `isReady` at
// runtime and trigger a re-render, mirroring the SDK's async startup signal.
const paraStatus = vi.hoisted(() => {
  let ready = false;
  const listeners = new Set<() => void>();
  return {
    reset() {
      ready = false;
    },
    setReady(value: boolean) {
      ready = value;
      for (const listener of listeners) listener();
    },
    getSnapshot: () => ready,
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
});

// Stub the heavy composer provider so importing the plugin does not pull in the
// full wallet-kit runtime tree.
vi.mock("./ParaPluginProvider", () => ({
  AomiParaPluginProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@getpara/react-sdk", async () => {
  const React = await import("react");
  return {
    default: {},
    Environment: { BETA: "BETA", PROD: "PROD" },
    // ParaProvider renders children immediately (matches the real SDK with
    // `waitForReady={false}`), so the watcher always mounts to observe status.
    ParaProvider: ({ children }: { children: ReactNode }) => children,
    useParaStatus: () => ({
      isReady: React.useSyncExternalStore(
        paraStatus.subscribe,
        paraStatus.getSnapshot,
        paraStatus.getSnapshot,
      ),
    }),
    useAccount: vi.fn(),
    useClient: vi.fn(),
    useLogout: vi.fn(),
    useModal: vi.fn(),
  };
});

// Imported after the mocks are registered.
const { paraPlugin } = await import("./para-plugin");

function renderLayer() {
  return render(
    <>
      {paraPlugin.wrap?.({
        auth: { provider: "para", methods: ["google"] },
        providers: { para: { apiKey: "test-api-key" } },
        children: <div>widget-body</div>,
      })}
    </>,
  );
}

describe("Para startup banner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    paraStatus.reset();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("never shows the banner when Para reports ready at startup, even after the timeout window (guards the effect-ordering clobber)", () => {
    paraStatus.setReady(true);
    renderLayer();

    expect(screen.getByText("widget-body")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the startup banner when Para never becomes ready within the timeout", () => {
    renderLayer();

    expect(screen.queryByRole("alert")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByRole("alert")).toBeTruthy();
    // Children keep rendering alongside the banner (additive auth layer).
    expect(screen.getByText("widget-body")).toBeTruthy();
  });

  it("disarms the watchdog when readiness flips true before the timeout", () => {
    renderLayer();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    act(() => {
      paraStatus.setReady(true);
    });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("recovers after Retry once Para becomes ready", () => {
    renderLayer();

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByRole("alert")).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByText("Retry"));
    });
    act(() => {
      paraStatus.setReady(true);
    });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("widget-body")).toBeTruthy();
  });
});

describe("Para availability gate", () => {
  const envKey = "NEXT_PUBLIC_PARA_API_KEY";
  let savedEnv: string | undefined;

  beforeEach(() => {
    savedEnv = process.env[envKey];
    delete process.env[envKey];
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env[envKey];
    else process.env[envKey] = savedEnv;
  });

  it("is available when the host passes providers.para.apiKey (no env needed)", () => {
    expect(
      paraPlugin.isAvailable?.({
        auth: { provider: "para" },
        providers: { para: { apiKey: "host-supplied-key" } },
      }),
    ).toBe(true);
  });

  it("is unavailable without an apiKey — the picker must not silently rely on Next-only env in cross-origin hosts", () => {
    expect(
      paraPlugin.isAvailable?.({
        auth: { provider: "para" },
        providers: { para: { environment: "BETA" } },
      }),
    ).toBe(false);
  });

  it("stays unavailable when auth does not request para, even with a key", () => {
    expect(
      paraPlugin.isAvailable?.({
        auth: false,
        providers: { para: { apiKey: "host-supplied-key" } },
      }),
    ).toBe(false);
  });
});
