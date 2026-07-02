"use client";

// =============================================================================
// useAuthorizationPermit — signed EIP-712 permit flow for wallet signing modes
// =============================================================================
//
// A wallet's `signing_mode` (autonomous | human_sync | denied) changes only
// through a signed permit: challenge (backend assembles the unsigned permit) →
// wallet signature over the returned typed data → commit (backend verifies and
// applies). This hook runs the whole flow as one `run()` call and exposes it
// as a small state machine, so settings surfaces in any app can wire a
// "change signing mode" button without re-implementing the wire choreography.
//
// Requires a WagmiProvider in the tree (it signs via wagmi's
// `useSignTypedData`) and an AomiClient whose requests carry the account
// bearer — the same auth the other `/api/account/*` calls use.

import { useCallback, useRef, useState } from "react";
import { useSignTypedData } from "wagmi";
import {
  AomiAuthorizationError,
  type AomiAuthorizationCommitResponse,
  type AomiClient,
  type AomiSigningMode,
  type AomiWalletFamily,
} from "@aomi-labs/client";

export type AuthorizationPermitInput = {
  chainType: AomiWalletFamily;
  wallet: string;
  mode: AomiSigningMode;
};

export type AuthorizationPermitStatus =
  | "idle"
  | "challenging"
  | "signing"
  | "committing"
  | "success"
  | "error";

export type AuthorizationPermitError = {
  /**
   * Backend machine code when known — `"stale_permit"` (someone else
   * committed first; run again to re-challenge) or
   * `"missing_delegated_grant"` (connect the wallet first). Null for wallet
   * rejections and transport failures.
   */
  code: string | null;
  /** Human-readable summary, pre-mapped for the known codes. */
  message: string;
};

export type AuthorizationPermitConfig = {
  /** Client whose requests carry the account bearer (getAccountBearer). */
  client: AomiClient;
  /** Get the current backend thread id (sent as the session header). */
  getSessionId: () => string;
};

export type AuthorizationPermitApi = {
  status: AuthorizationPermitStatus;
  error: AuthorizationPermitError | null;
  result: AomiAuthorizationCommitResponse | null;
  /** Run challenge → sign → commit. Resolves null on failure (see `error`). */
  run: (
    input: AuthorizationPermitInput,
  ) => Promise<AomiAuthorizationCommitResponse | null>;
};

function permitError(err: unknown): AuthorizationPermitError {
  if (err instanceof AomiAuthorizationError) {
    switch (err.code) {
      case "stale_permit":
        return {
          code: err.code,
          message:
            "Authorization changed elsewhere — re-challenge needed. Run the flow again.",
        };
      case "missing_delegated_grant":
        return {
          code: err.code,
          message:
            "Connect this wallet first — autonomous signing needs a delegated grant.",
        };
      default:
        return { code: err.code, message: err.message };
    }
  }
  return {
    code: null,
    message: err instanceof Error ? err.message : String(err),
  };
}

export function useAuthorizationPermit({
  client,
  getSessionId,
}: AuthorizationPermitConfig): AuthorizationPermitApi {
  const { signTypedDataAsync } = useSignTypedData();

  const [status, setStatus] = useState<AuthorizationPermitStatus>("idle");
  const [error, setError] = useState<AuthorizationPermitError | null>(null);
  const [result, setResult] = useState<AomiAuthorizationCommitResponse | null>(
    null,
  );
  // Prevents a double-click from double-prompting the wallet.
  const runningRef = useRef(false);

  const run = useCallback(
    async (
      input: AuthorizationPermitInput,
    ): Promise<AomiAuthorizationCommitResponse | null> => {
      if (runningRef.current) return null;
      runningRef.current = true;

      setStatus("challenging");
      setError(null);
      setResult(null);

      try {
        const sessionId = getSessionId();
        const challenge = await client.challengeAuthorization(sessionId, {
          chain_type: input.chainType,
          wallet: input.wallet,
          mode: input.mode,
        });

        setStatus("signing");
        const signature = await signTypedDataAsync(
          challenge.typed_data as Parameters<typeof signTypedDataAsync>[0],
        );

        setStatus("committing");
        const committed = await client.commitAuthorization(sessionId, {
          permit: challenge.permit,
          signature,
        });

        setStatus("success");
        setResult(committed);
        return committed;
      } catch (err) {
        setStatus("error");
        setError(permitError(err));
        return null;
      } finally {
        runningRef.current = false;
      }
    },
    [client, getSessionId, signTypedDataAsync],
  );

  return { status, error, result, run };
}
