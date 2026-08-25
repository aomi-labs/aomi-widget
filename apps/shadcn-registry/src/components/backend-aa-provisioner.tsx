"use client";

import { useEffect } from "react";
import { useAomiRuntime } from "@aomi-labs/react";
import { useAomiWalletKit } from "../lib/wallet-kit";
import { useBackendAa } from "../lib/wallet-kit/execution/backend-aa-context";

export function BackendAaProvisioner({
  applicationId,
}: {
  applicationId: string;
}) {
  const { currentThreadId } = useAomiRuntime();
  const wallet = useAomiWalletKit();
  const backend = useBackendAa();
  const owner = wallet.identity.address;
  const chainId = wallet.identity.chainId;
  const numericApplicationId = Number(applicationId);

  useEffect(() => {
    if (
      !owner ||
      !chainId ||
      !wallet.accountUser ||
      !backend.getAccountBearer ||
      // A non-numeric applicationId would serialize as `null` in the PUT body
      // while the GET query still carries the raw string — the two calls would
      // then disagree on the application identity. Skip rather than misprovision.
      !Number.isInteger(numericApplicationId)
    ) {
      if (applicationId && !Number.isInteger(numericApplicationId)) {
        console.warn(
          "[BackendAaProvisioner] applicationId is not a valid integer",
          applicationId,
        );
      }
      return;
    }
    const controller = new AbortController();

    void (async () => {
      const bearer = await backend.getAccountBearer?.();
      if (!bearer || controller.signal.aborted) return;
      const headers = {
        authorization: `Bearer ${bearer}`,
        "x-thread-id": currentThreadId,
      };
      const query = new URLSearchParams({
        application_id: applicationId,
        chain_id: String(chainId),
        owner,
      });
      const profileResponse = await fetch(
        `${backend.apiUrl}/api/widget/v1/execution-profile?${query}`,
        { credentials: "omit", headers, signal: controller.signal },
      );
      if (!profileResponse.ok) return;
      const profile = (await profileResponse.json()) as {
        accountStatus?: string;
      };
      if (profile.accountStatus === "active" || controller.signal.aborted)
        return;
      await fetch(`${backend.apiUrl}/api/widget/v1/aa-accounts/${chainId}`, {
        method: "PUT",
        credentials: "omit",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ applicationId: numericApplicationId, owner }),
        signal: controller.signal,
      });
    })().catch((error) => {
      if (!controller.signal.aborted) {
        console.warn("[BackendAaProvisioner] provisioning unavailable", error);
      }
    });

    return () => controller.abort();
  }, [
    applicationId,
    numericApplicationId,
    backend.apiUrl,
    backend.getAccountBearer,
    chainId,
    currentThreadId,
    owner,
    wallet.accountUser,
  ]);

  return null;
}
