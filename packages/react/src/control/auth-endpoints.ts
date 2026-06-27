// =============================================================================
// useAuthEndpoints — fetch authorized apps + available models from BE
// =============================================================================
//
// Both endpoints share three traits:
//   - Scoped to the auth context (apiKey + clientId), NOT per-thread
//   - Cached in React state once fetched, refreshed only when auth changes
//   - Used by per-thread-control to validate model/app selections
//
// Background: the deps on these effects USED to include `sessionId` (current
// thread id) before the May 2026 fix. That caused refire on every thread
// switch — a ~3 s `/api/session/apps` call burned per click. The stable
// `getControlSessionId` callback (provided by the caller) reads from refs
// inside, so the effect deps stay quiet across thread switches.

import { useCallback, useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { AomiAppDescriptor, AomiClient } from "@aomi-labs/client";
import { resolveAutoModel } from "../utils/model-selection";

export type AuthEndpointsState = {
  availableModels: string[];
  defaultModel: string | null;
  authorizedApps: string[];
  appDescriptors: AomiAppDescriptor[];
  defaultApp: string | null;
};

export type AuthEndpointsActions = {
  /** Force a refresh of the models list. */
  getAvailableModels: () => Promise<string[]>;
  /** Force a refresh of the authorized apps list. */
  getAuthorizedApps: () => Promise<string[]>;
};

type UseAuthEndpointsOptions = {
  aomiClientRef: MutableRefObject<AomiClient>;
  apiKeyRef: MutableRefObject<string | null>;
  /** Stable getter for the current control-session id (clientId + sessionId). */
  getControlSessionId: () => string;
  /** Trigger that should cause apps to refetch (e.g. apiKey changes). */
  apiKey: string | null;
  /** Optional backend platform filter for the app catalog. */
  appPlatform?: string | null;
};

function getDefaultApp(apps: string[]): string | null {
  return apps.includes("default") ? "default" : (apps[0] ?? null);
}

function namesFromDescriptors(apps: ReadonlyArray<{ name: string }>): string[] {
  return apps.map((a) => a.name);
}

/** Provider-internal: owns the apps/models state. Consumers should use the
 *  `useAuthEndpoints` slice reader exported from contexts/control-context.tsx. */
export function useAuthEndpointsImpl({
  aomiClientRef,
  apiKeyRef,
  getControlSessionId,
  apiKey,
  appPlatform,
}: UseAuthEndpointsOptions): {
  state: AuthEndpointsState;
  actions: AuthEndpointsActions;
} {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [authorizedApps, setAuthorizedApps] = useState<string[]>([]);
  const [appDescriptors, setAppDescriptors] = useState<AomiAppDescriptor[]>([]);
  const [defaultApp, setDefaultApp] = useState<string | null>(null);

  // Fetch apps whenever the auth context changes. Scoped to apiKey/clientId
  // state, NOT to thread switches — see header comment for history.
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const descriptors = await aomiClientRef.current.getApps(
          getControlSessionId(),
          {
            apiKey: apiKeyRef.current ?? undefined,
            platform: appPlatform,
          },
        );
        const names = namesFromDescriptors(descriptors);
        setAuthorizedApps(names);
        setAppDescriptors(descriptors);
        setDefaultApp(getDefaultApp(names));
      } catch (error) {
        console.error("Failed to fetch apps:", error);
        setAuthorizedApps(["default"]);
        setAppDescriptors([{ name: "default" }]);
        setDefaultApp("default");
      }
    };
    void fetchApps();
    // apiKey is the only meaningful trigger; everything else is refs.
  }, [aomiClientRef, getControlSessionId, apiKey, appPlatform]);

  // Fetch models on mount only.
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await aomiClientRef.current.getModels(
          getControlSessionId(),
        );
        setAvailableModels(models);
        setDefaultModel(resolveAutoModel(models));
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    void fetchModels();
  }, [aomiClientRef, getControlSessionId]);

  // ---------------------------------------------------------------------------
  // Imperative refresh actions (used by the control bar to force a re-fetch
  // after the user takes an action that might change authorization).
  // ---------------------------------------------------------------------------

  const getAvailableModels = useCallback(async (): Promise<string[]> => {
    try {
      const models = await aomiClientRef.current.getModels(
        getControlSessionId(),
      );
      setAvailableModels(models);
      setDefaultModel(resolveAutoModel(models));
      return models;
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }, [aomiClientRef, getControlSessionId]);

  const getAuthorizedApps = useCallback(async (): Promise<string[]> => {
    try {
      const descriptors = await aomiClientRef.current.getApps(
        getControlSessionId(),
        {
          apiKey: apiKeyRef.current ?? undefined,
          platform: appPlatform,
        },
      );
      const names = namesFromDescriptors(descriptors);
      setAuthorizedApps(names);
      setAppDescriptors(descriptors);
      setDefaultApp(getDefaultApp(names));
      return names;
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      setAuthorizedApps(["default"]);
      setAppDescriptors([{ name: "default" }]);
      setDefaultApp("default");
      return ["default"];
    }
  }, [aomiClientRef, apiKeyRef, getControlSessionId, appPlatform]);

  return {
    state: {
      availableModels,
      defaultModel,
      authorizedApps,
      appDescriptors,
      defaultApp,
    },
    actions: { getAvailableModels, getAuthorizedApps },
  };
}
