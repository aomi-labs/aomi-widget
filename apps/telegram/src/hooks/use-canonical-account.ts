"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useClient } from "@getpara/react-sdk-lite";
import {
  createProviderCredentialAdapter,
  createWidgetSessionProvider,
  type WidgetSessionProvider,
} from "@aomi-labs/client";

import { aomiBffUrl, paraEnvironment } from "@/app/config";

type CanonicalAccountState = {
  error: string | null;
  provider: WidgetSessionProvider | null;
  status: "disconnected" | "loading" | "ready" | "error";
  userId: string | null;
};

export function useCanonicalAccount(): CanonicalAccountState {
  const account = useAccount();
  const paraClient = useClient();
  const paraSubject = account.embedded.userId ?? paraClient?.userId ?? null;
  const [state, setState] = useState<Omit<CanonicalAccountState, "provider">>({
    error: null,
    status: "disconnected",
    userId: null,
  });

  const provider = useMemo(() => {
    if (!account.embedded.isConnected || !paraClient) return null;
    const adapter = createProviderCredentialAdapter({
      provider: "para",
      environment: paraEnvironment,
      getCredential: async () => {
        const credential = await paraClient.issueJwt({});
        const providerToken = credential.token.trim();
        return providerToken
          ? {
              provider: "para",
              tokenKind: "session_jwt",
              providerToken,
              keyId: credential.keyId,
            }
          : null;
      },
      getSubject: () => paraSubject,
    });
    return createWidgetSessionProvider({ baseUrl: aomiBffUrl, adapter });
  }, [account.embedded.isConnected, paraClient, paraSubject]);

  useEffect(() => {
    if (!provider) return;

    let active = true;
    queueMicrotask(() => {
      if (active) setState({ error: null, status: "loading", userId: null });
    });
    void provider()
      .then(async (accessToken) => {
        const response = await fetch(`${aomiBffUrl}/api/aomi/account`, {
          credentials: "omit",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          throw new Error(`canonical_account_failed_${response.status}`);
        }
        const body = (await response.json()) as {
          user?: { id?: unknown } | null;
        };
        if (typeof body.user?.id !== "string") {
          throw new Error("canonical_account_missing");
        }
        if (active) {
          setState({ error: null, status: "ready", userId: body.user.id });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          error:
            error instanceof Error ? error.message : "canonical_account_failed",
          status: "error",
          userId: null,
        });
      });

    return () => {
      active = false;
      provider.dispose();
    };
  }, [provider]);

  return provider
    ? { ...state, provider }
    : { error: null, provider: null, status: "disconnected", userId: null };
}
