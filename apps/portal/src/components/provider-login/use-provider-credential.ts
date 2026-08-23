"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";
import {
  PORTAL_PROVIDER_LABELS,
  type PortalEmbeddedProvider,
} from "@portal/lib/provider-login/types";
import {
  waitForProviderCredential,
  type WaitForProviderCredentialOptions,
} from "@portal/lib/provider-login/wait-for-credential";

export function usePortalProviderCredential(input: {
  completeStatus: string;
  initialStatus: string;
  onCredential: (credential: unknown) => Promise<void>;
  provider: PortalEmbeddedProvider;
  waitOptions?: WaitForProviderCredentialOptions;
  workingStatus: string;
  workingStatusTiming: "before_wait" | "after_credential";
}) {
  const walletKit = useAomiWalletKit();
  const [status, setStatus] = useState(input.initialStatus);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [exchangeRequested, setExchangeRequested] = useState(false);
  const connectSocial = walletKit.connectSocial;
  const getAccountCredential = walletKit.getAccountCredential;
  const label = PORTAL_PROVIDER_LABELS[input.provider];
  const onCredentialRef = useRef(input.onCredential);
  const waitOptionsRef = useRef(input.waitOptions);
  const workingStatusRef = useRef(input.workingStatus);
  const completeStatusRef = useRef(input.completeStatus);
  const workingStatusTimingRef = useRef(input.workingStatusTiming);
  onCredentialRef.current = input.onCredential;
  waitOptionsRef.current = input.waitOptions;
  workingStatusRef.current = input.workingStatus;
  completeStatusRef.current = input.completeStatus;
  workingStatusTimingRef.current = input.workingStatusTiming;

  const start = useCallback(async () => {
    setPending(true);
    setStatus(`Opening ${label}...`);
    try {
      await connectSocial?.("google");
      setStatus("Waiting for provider credential...");
      setExchangeRequested(true);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Authentication failed",
      );
      setPending(false);
    }
  }, [connectSocial, label]);

  useEffect(() => {
    if (!exchangeRequested || complete || !pending) return;
    let cancelled = false;
    const run = async () => {
      try {
        if (workingStatusTimingRef.current === "before_wait") {
          setStatus(workingStatusRef.current);
        }
        const credential = await waitForProviderCredential(
          () => getAccountCredential?.(),
          waitOptionsRef.current,
        );
        if (cancelled) return;
        if (workingStatusTimingRef.current === "after_credential") {
          setStatus(workingStatusRef.current);
        }
        await onCredentialRef.current(credential);
        if (cancelled) return;
        setComplete(true);
        setStatus(completeStatusRef.current);
      } catch (error) {
        if (cancelled) return;
        setStatus(
          error instanceof Error ? error.message : "Authentication failed",
        );
        setExchangeRequested(false);
        setPending(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [complete, exchangeRequested, getAccountCredential, pending]);

  return {
    complete,
    pending,
    start,
    status,
  };
}
