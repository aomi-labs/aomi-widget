import React, { forwardRef, useImperativeHandle } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ControlContextProvider,
  useControl,
  type ControlContextApi,
} from "../control-context";

type HarnessHandle = {
  control: ControlContextApi;
};

const Harness = forwardRef<HarnessHandle>((_, ref) => {
  const control = useControl();
  useImperativeHandle(ref, () => ({ control }), [control]);
  return null;
});

Harness.displayName = "Harness";

const renderControlContext = (clientOverrides?: Record<string, unknown>) => {
  const ref = React.createRef<HarnessHandle>();
  const aomiClient = {
    getApps: vi.fn(async () => ["default"]),
    getModels: vi.fn(async () => []),
    ingestSecrets: vi.fn(async () => ({ handles: {} })),
    deleteSecret: vi.fn(async () => ({ deleted: true })),
    ...clientOverrides,
  };

  const result = render(
    <ControlContextProvider
      aomiClient={aomiClient as never}
      sessionId="session-1"
      getThreadMetadata={() => undefined}
      updateThreadMetadata={() => {}}
    >
      <Harness ref={ref} />
    </ControlContextProvider>,
  );

  if (!ref.current) {
    throw new Error("Harness did not mount");
  }

  return {
    ...result,
    aomiClient,
    getControl: () => ref.current!.control,
  };
};

beforeEach(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
});

afterEach(() => {
  cleanup();
});

describe("ControlContextProvider", () => {
  it("initializes client id synchronously on first render", () => {
    const { getControl } = renderControlContext();
    expect(getControl().state.clientId).toBeTruthy();
  });

  it("reuses the stored client id across remounts", async () => {
    const first = renderControlContext();

    await waitFor(() => {
      expect(first.getControl().state.clientId).toBeTruthy();
    });

    const firstClientId = first.getControl().state.clientId!;
    expect(globalThis.localStorage.getItem("aomi_client_id")).toBe(firstClientId);

    first.unmount();

    const second = renderControlContext();
    await waitFor(() => {
      expect(second.getControl().state.clientId).toBe(firstClientId);
    });
  });

  it("sends a targeted backend removal when a provider key is deleted", async () => {
    const deleteSecret = vi.fn(async () => ({ deleted: true }));
    const { aomiClient, getControl } = renderControlContext({ deleteSecret });

    await waitFor(() => {
      expect(getControl().state.clientId).toBeTruthy();
    });

    const clientId = getControl().state.clientId!;

    await act(async () => {
      await getControl().setProviderKey("openai", "sk-openai-123");
    });

    await waitFor(() => {
      expect(getControl().state.providerKeys.openai?.apiKey).toBe("sk-openai-123");
    });

    await act(async () => {
      await getControl().removeProviderKey("openai");
    });

    await waitFor(() => {
      expect(deleteSecret).toHaveBeenCalledWith(
        clientId,
        "PROVIDER_KEY:openai",
      );
    });

    expect(getControl().state.providerKeys.openai).toBeUndefined();
    expect(aomiClient.ingestSecrets).toHaveBeenCalledWith(clientId, {
      "PROVIDER_KEY:openai": "sk-openai-123",
    });
  });

  it("auto-ingests provider keys loaded from localStorage on mount", async () => {
    globalThis.localStorage.setItem("aomi_client_id", "client-stored");
    globalThis.localStorage.setItem(
      "aomi_provider_keys",
      JSON.stringify({
        openai: {
          apiKey: "sk-openai-abc",
          keyPrefix: "sk-open",
          label: "Primary",
        },
      }),
    );

    const ingestSecrets = vi.fn(async () => ({ handles: {} }));
    renderControlContext({ ingestSecrets });

    await waitFor(() => {
      expect(ingestSecrets).toHaveBeenCalledWith("client-stored", {
        "PROVIDER_KEY:openai": "sk-openai-abc",
      });
    });
  });
});
