// =============================================================================
// usePerThreadControl — per-thread model & app selection
// =============================================================================
//
// Each chat thread carries its own "control" metadata (model, modelMode, app,
// isProcessing, controlDirty). This hook owns:
//   - Reading / writing that per-thread metadata.
//   - The auto-effect that fills in a missing model from stored preference
//     OR re-aligns "auto" threads to the latest available default.
//   - The two user-facing setters (onModelSelect, onAppSelect).
//   - The pending-control sync to the backend before sending (the actual
//     send path calls this via prepareThreadForSend).
//
// State that isn't per-thread (apiKey, available models, authorized apps)
// is read via refs — this hook depends on but doesn't own them.

import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import type { AomiClient } from "@aomi-labs/client";
import {
  initThreadControl,
  type ThreadControlState,
  type ThreadMetadata,
  type ModelSelectionMode,
} from "../state/thread-store";
import { resolveAutoModel } from "../utils/model-selection";

const MODEL_SELECTION_STORAGE_KEY = "aomi_model_selection";

type StoredModelPreference = {
  mode: ModelSelectionMode;
  model: string | null;
};

function readStoredModelPreference(): StoredModelPreference {
  try {
    const raw = globalThis.localStorage?.getItem(MODEL_SELECTION_STORAGE_KEY);
    if (!raw) return { mode: "auto", model: null };
    const parsed = JSON.parse(raw) as Partial<StoredModelPreference>;
    return {
      mode: parsed.mode === "manual" ? "manual" : "auto",
      model: typeof parsed.model === "string" ? parsed.model : null,
    };
  } catch {
    return { mode: "auto", model: null };
  }
}

function writeStoredModelPreference(preference: StoredModelPreference): void {
  try {
    globalThis.localStorage?.setItem(
      MODEL_SELECTION_STORAGE_KEY,
      JSON.stringify(preference),
    );
  } catch {
    // localStorage not available
  }
}

function resolvePreferredModelSelection(
  preference: StoredModelPreference,
  models: string[],
  defaultModel: string | null,
): StoredModelPreference {
  if (
    preference.mode === "manual" &&
    preference.model &&
    models.includes(preference.model)
  ) {
    return preference;
  }
  if (preference.mode === "auto") {
    return {
      mode: "auto",
      model: resolveAutoModel(models) ?? defaultModel,
    };
  }
  return {
    mode: "auto",
    model: defaultModel ?? resolveAutoModel(models),
  };
}

function getFallbackModel(
  models: string[],
  defaultModel: string | null,
): string | null {
  return defaultModel ?? resolveAutoModel(models);
}

function resolveAuthorizedApp(
  app: string | null | undefined,
  authorizedApps: string[],
  defaultApp: string | null,
): string | null {
  if (app && authorizedApps.includes(app)) return app;
  return defaultApp;
}

export type PerThreadControlActions = {
  getCurrentThreadControl: () => ThreadControlState;
  getCurrentThreadApp: () => string;
  getPreferredThreadControl: () => ThreadControlState;
  onModelSelect: (
    model: string,
    options?: { mode?: ModelSelectionMode },
  ) => Promise<void>;
  onAppSelect: (app: string) => void;
  markControlSynced: () => void;
  syncCurrentThreadControl: () => Promise<void>;
};

type UsePerThreadControlOptions = {
  aomiClientRef: MutableRefObject<AomiClient>;
  sessionIdRef: MutableRefObject<string>;
  apiKeyRef: MutableRefObject<string | null>;
  clientIdRef: MutableRefObject<string | null>;
  getThreadMetadataRef: MutableRefObject<
    (threadId: string) => ThreadMetadata | undefined
  >;
  updateThreadMetadataRef: MutableRefObject<
    (threadId: string, partial: Partial<ThreadMetadata>) => void
  >;
  /** Reactive auth-endpoint state — the auto-model effect reads from these. */
  availableModels: string[];
  defaultModel: string | null;
  /** Refs for the same data, used by callbacks that fire outside render. */
  availableModelsRef: MutableRefObject<string[]>;
  defaultModelRef: MutableRefObject<string | null>;
  authorizedAppsRef: MutableRefObject<string[]>;
  defaultAppRef: MutableRefObject<string | null>;
  /** Current thread id (reactive — used to retrigger the auto-model effect). */
  sessionId: string;
};

/** Provider-internal: owns per-thread control wiring. Consumers should use
 *  the `usePerThreadControl` slice reader from contexts/control-context.tsx. */
export function usePerThreadControlImpl({
  aomiClientRef,
  sessionIdRef,
  apiKeyRef,
  clientIdRef,
  getThreadMetadataRef,
  updateThreadMetadataRef,
  availableModels,
  defaultModel,
  availableModelsRef,
  defaultModelRef,
  authorizedAppsRef,
  defaultAppRef,
  sessionId,
}: UsePerThreadControlOptions): {
  actions: PerThreadControlActions;
  isProcessing: boolean;
} {
  // Compute isProcessing for the current thread (read during render — must
  // not be a useCallback that reads from refs).
  const currentMeta = getThreadMetadataRef.current(sessionId);
  const isProcessing = currentMeta?.control?.isProcessing ?? false;

  const getCurrentThreadControl = useCallback((): ThreadControlState => {
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return metadata?.control ?? initThreadControl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPreferredThreadControl = useCallback((): ThreadControlState => {
    const preference = readStoredModelPreference();
    const selection = resolvePreferredModelSelection(
      preference,
      availableModelsRef.current,
      defaultModelRef.current,
    );
    return {
      ...initThreadControl(),
      model: selection.model,
      modelMode: selection.mode,
      controlDirty: selection.model !== null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCurrentThreadApp = useCallback((): string => {
    const currentControl =
      getThreadMetadataRef.current(sessionIdRef.current)?.control ??
      initThreadControl();
    return (
      resolveAuthorizedApp(
        currentControl.app,
        authorizedAppsRef.current,
        defaultAppRef.current,
      ) ?? "default"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onModelSelect = useCallback(
    async (model: string, options?: { mode?: ModelSelectionMode }) => {
      const threadId = sessionIdRef.current;
      const currentControl =
        getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();
      if (currentControl.isProcessing) {
        console.warn(
          "[per-thread-control] Cannot switch model while processing",
        );
        return;
      }

      const modelMode = options?.mode ?? "manual";
      const app =
        resolveAuthorizedApp(
          currentControl.app,
          authorizedAppsRef.current,
          defaultAppRef.current,
        ) ?? "default";

      updateThreadMetadataRef.current(threadId, {
        control: {
          ...currentControl,
          model,
          modelMode,
          app,
          controlDirty: true,
        },
      });

      try {
        await aomiClientRef.current.setModel(threadId, model, {
          app,
          apiKey: apiKeyRef.current ?? undefined,
          clientId: clientIdRef.current ?? undefined,
        });
        writeStoredModelPreference({
          mode: modelMode,
          model: modelMode === "manual" ? model : null,
        });
        const latestControl =
          getThreadMetadataRef.current(threadId)?.control ?? currentControl;
        if (latestControl.model === model && latestControl.app === app) {
          updateThreadMetadataRef.current(threadId, {
            control: {
              ...latestControl,
              modelMode,
              controlDirty: false,
            },
          });
        }
      } catch (err) {
        console.error("[per-thread-control] setModel failed:", err);
        throw err;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  const onAppSelect = useCallback((app: string) => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();
    if (currentControl.isProcessing) {
      console.warn("[per-thread-control] Cannot switch app while processing");
      return;
    }
    if (
      authorizedAppsRef.current.length > 0 &&
      !authorizedAppsRef.current.includes(app)
    ) {
      console.warn("[per-thread-control] Cannot select unauthorized app", {
        app,
      });
      return;
    }
    updateThreadMetadataRef.current(threadId, {
      control: {
        ...currentControl,
        app,
        controlDirty: true,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markControlSynced = useCallback(() => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();
    if (currentControl.controlDirty) {
      updateThreadMetadataRef.current(threadId, {
        control: { ...currentControl, controlDirty: false },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncCurrentThreadControl = useCallback(async () => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();

    if (
      !currentControl.controlDirty ||
      currentControl.isProcessing ||
      !currentControl.model
    ) {
      return;
    }

    const app =
      resolveAuthorizedApp(
        currentControl.app,
        authorizedAppsRef.current,
        defaultAppRef.current,
      ) ?? "default";

    await aomiClientRef.current.setModel(threadId, currentControl.model, {
      app,
      apiKey: apiKeyRef.current ?? undefined,
      clientId: clientIdRef.current ?? undefined,
    });

    const latestControl =
      getThreadMetadataRef.current(threadId)?.control ?? currentControl;
    if (
      latestControl.model === currentControl.model &&
      latestControl.app === currentControl.app
    ) {
      updateThreadMetadataRef.current(threadId, {
        control: {
          ...latestControl,
          app,
          controlDirty: false,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-effect: fill in a missing model from stored preference, or
  // re-align an "auto" thread to the latest available default after the
  // backend model list refreshes.
  useEffect(() => {
    const threadId = sessionIdRef.current;
    const metadata = getThreadMetadataRef.current(threadId);
    if (!metadata || metadata.control.isProcessing) return;

    const currentControl = metadata.control;
    let nextControl: ThreadControlState | null = null;

    if (currentControl.model === null) {
      const preferred = getPreferredThreadControl();
      if (!preferred.model) return;
      nextControl = {
        ...currentControl,
        model: preferred.model,
        modelMode: preferred.modelMode,
        controlDirty: true,
      };
    } else if (availableModels.length > 0) {
      const currentMode = currentControl.modelMode ?? "manual";

      if (currentMode === "auto") {
        const autoModel = getFallbackModel(availableModels, defaultModel);
        if (autoModel && currentControl.model !== autoModel) {
          nextControl = {
            ...currentControl,
            model: autoModel,
            modelMode: "auto",
            controlDirty: true,
          };
        }
      } else if (!availableModels.includes(currentControl.model)) {
        const fallbackModel = getFallbackModel(availableModels, defaultModel);
        if (fallbackModel) {
          nextControl = {
            ...currentControl,
            model: fallbackModel,
            modelMode: "auto",
            controlDirty: true,
          };
        }
      }
    }

    if (!nextControl) return;
    updateThreadMetadataRef.current(threadId, { control: nextControl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPreferredThreadControl, sessionId, availableModels, defaultModel]);

  return {
    actions: {
      getCurrentThreadControl,
      getCurrentThreadApp,
      getPreferredThreadControl,
      onModelSelect,
      onAppSelect,
      markControlSynced,
      syncCurrentThreadControl,
    },
    isProcessing,
  };
}
