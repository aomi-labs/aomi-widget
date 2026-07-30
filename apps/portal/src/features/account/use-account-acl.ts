"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  authorizationChallenge,
  authorizationCommit,
  type AuthorizationPoster,
  type WalletEip712Payload,
} from "@aomi-labs/client";
import { useOptionalAomiRuntime } from "@aomi-labs/react";
import { useAomiWalletKit, usePrivyDelegation } from "@aomi-labs/widget-lib";
import { accountScopedFetch } from "@portal/lib/settings-api";
import {
  explainAccountError,
  fetchGrants,
  fetchWalletPolicies,
  revokeProviderGrant,
  shortenAddress,
} from "./account-api";
import type { DelegationGrant, SignerMode, WalletPolicy } from "./types";

const post: AuthorizationPoster = (path, body) =>
  accountScopedFetch(path, { method: "POST", body: JSON.stringify(body) });

/** Run `action`, restating any failure in words the user can act on. */
async function readable<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (cause) {
    throw new Error(explainAccountError(cause));
  }
}

/**
 * Permit direction, mirroring the kernel's `SigningMode` rank ladder. The
 * backend decides *whose signature counts* from this: loosening authority
 * requires the wallet itself to sign, tightening accepts any key linked to the
 * account. We compute it client-side only to explain the requirement up front
 * rather than after a rejected signature.
 */
const MODE_RANK: Record<SignerMode, number> = {
  denied: 0,
  manual: 1,
  client_auto: 2,
  auto: 3,
};

export function isLoosening(from: SignerMode, to: SignerMode): boolean {
  return MODE_RANK[to] > MODE_RANK[from];
}

export type AclStatus = "loading" | "ready" | "error";

export type AccountAcl = {
  status: AclStatus;
  error?: string;
  wallets: WalletPolicy[];
  grants: DelegationGrant[];
  refresh: () => Promise<void>;
  /** Run the permit ceremony; resolves once the new mode is committed. */
  commitMode: (wallet: WalletPolicy, mode: SignerMode) => Promise<void>;
  revokeGrant: (grant: DelegationGrant) => Promise<void>;
  stopAllAuto: () => Promise<void>;
  /** Start a fresh Privy embedded-wallet delegation for the current thread. */
  connectPrivy: () => Promise<void>;
  /** Re-open the provider so a fresh grant can be minted, then reload. */
  regrant: (wallet: WalletPolicy) => Promise<void>;
  /** Why this wallet can't sign the given change right now, or null if it can. */
  blockedReason: (wallet: WalletPolicy, mode: SignerMode) => string | null;
};

export function useAccountAcl(): AccountAcl {
  const adapter = useAomiWalletKit();
  const runtime = useOptionalAomiRuntime();
  const privyDelegation = usePrivyDelegation();
  const [wallets, setWallets] = useState<WalletPolicy[]>([]);
  const [grants, setGrants] = useState<DelegationGrant[]>([]);
  const [status, setStatus] = useState<AclStatus>("loading");
  const [error, setError] = useState<string | undefined>();
  // Late responses from a superseded load must not clobber fresher state.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The key that will actually produce the signature, not the displayed
  // identity. `identity.address` survives a disconnect on a grace window and
  // can name a different wallet than the connector `signTypedData` uses; a
  // permit checked against the former and signed by the latter is rejected by
  // the backend as `wrong_signer` only after the user has already approved it.
  const evmAddress = adapter.evmSigningAddress ?? adapter.identity.address;
  const evmCanSign = adapter.evmCanSign ?? true;
  const svmAddress = adapter.identity.svmAddress;
  const svmCluster =
    adapter.identity.svmCluster ?? adapter.identity.solanaCluster;
  const signTypedData = adapter.signTypedData;
  const signSolanaMessage = adapter.signSolanaMessage;
  const openAccountUI = adapter.openAccountUI;
  const currentThreadId = runtime?.currentThreadId;

  const refresh = useCallback(async () => {
    try {
      const [nextWallets, nextGrants] = await Promise.all([
        fetchWalletPolicies(),
        fetchGrants(),
      ]);
      if (!mounted.current) return;
      setWallets(nextWallets);
      setGrants(nextGrants);
      setStatus("ready");
      setError(undefined);
    } catch (cause) {
      if (!mounted.current) return;
      setStatus("error");
      setError(explainAccountError(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Which of *this account's* connected keys can produce a signature for a
   * permit on `wallet`'s chain. Chain-matched on purpose: an EVM permit is an
   * EIP-712 hash and an SVM permit is an Ed25519 message — one connected wallet
   * can't stand in for the other.
   */
  const signerFor = useCallback(
    (wallet: WalletPolicy) =>
      wallet.chain === "evm"
        ? {
            address: evmAddress,
            // `evmCanSign` is false for a provider session with no wagmi
            // connector: the address is real but nothing can sign for it, and
            // wagmi would otherwise fall through to another connected wallet.
            canSign: Boolean(signTypedData && evmAddress && evmCanSign),
          }
        : {
            address: svmAddress,
            canSign: Boolean(signSolanaMessage && svmAddress),
          },
    [evmAddress, evmCanSign, svmAddress, signSolanaMessage, signTypedData],
  );

  const blockedReason = useCallback(
    (wallet: WalletPolicy, mode: SignerMode): string | null => {
      if (mode === "auto" && wallet.canUseAuto === false) {
        return "This wallet has no active delegation grant to sign with.";
      }
      const signer = signerFor(wallet);
      const chainLabel = wallet.chain === "evm" ? "Ethereum" : "Solana";
      if (!signer.canSign) {
        // "Connect a wallet" reads as nonsense when one plainly is connected.
        if (wallet.chain === "evm" && evmAddress && !evmCanSign) {
          return `${shortenAddress(evmAddress)} is connected through its provider, which has no signer wired into this app yet, so it can't sign this authorization.`;
        }
        return `Connect a ${chainLabel} wallet to sign this authorization.`;
      }
      // Loosening authority must be signed by the wallet whose authority grows
      // — except for provider-managed keys, where the user holds no key
      // material and the backend accepts any linked sibling key instead.
      const needsSelf =
        isLoosening(wallet.desiredMode, mode) && !wallet.providerManaged;
      if (
        needsSelf &&
        signer.address?.toLowerCase() !== wallet.address.toLowerCase()
      ) {
        // Name both sides: with several wallets connected, "connect this wallet"
        // gave no clue which one was about to be asked for the signature.
        return `Only ${shortenAddress(wallet.address)} can widen what it may sign, but ${shortenAddress(
          signer.address ?? "",
        )} is the active wallet. Switch to it and try again.`;
      }
      return null;
    },
    [evmAddress, evmCanSign, signerFor],
  );

  const commitMode = useCallback(
    async (wallet: WalletPolicy, mode: SignerMode) => {
      const blocked = blockedReason(wallet, mode);
      if (blocked) throw new Error(blocked);

      const challenge = await readable(() =>
        authorizationChallenge(post, {
          chain_type: wallet.chain,
          wallet: wallet.address,
          mode,
        }),
      );

      if (wallet.chain === "evm") {
        if (!challenge.typed_data || !signTypedData) {
          throw new Error("This wallet cannot sign EIP-712 authorizations.");
        }
        const { signature } = await readable(() =>
          signTypedData({
            // The backend assembles wagmi-ready EIP-712; the wire type is
            // `unknown` because only the wallet interprets it.
            typed_data:
              challenge.typed_data as WalletEip712Payload["typed_data"],
            description: permitDescription(wallet, mode),
          }),
        );
        await readable(() =>
          authorizationCommit(post, { permit: challenge.permit, signature }),
        );
      } else {
        if (!challenge.message_base64 || !signSolanaMessage) {
          throw new Error("This wallet cannot sign Solana authorizations.");
        }
        const { signature } = await readable(() =>
          signSolanaMessage({
            message: challenge.message_base64 as string,
            cluster: svmCluster,
            description: permitDescription(wallet, mode),
          }),
        );
        // Ed25519 has no recovery, so the signer is named rather than derived.
        await readable(() =>
          authorizationCommit(post, {
            permit: challenge.permit,
            signature,
            ...(svmAddress ? { signer: svmAddress } : {}),
          }),
        );
      }

      await refresh();
    },
    [
      blockedReason,
      refresh,
      signSolanaMessage,
      signTypedData,
      svmAddress,
      svmCluster,
    ],
  );

  const revokeGrant = useCallback(
    async (grant: DelegationGrant) => {
      const providerKey = grant.providerKey ?? grant.provider.toLowerCase();
      await readable(() => revokeProviderGrant(providerKey));
      await refresh();
    },
    [refresh],
  );

  const stopAllAuto = useCallback(async () => {
    const providers = new Set(
      grants
        .filter((grant) => grant.status === "active")
        .map((grant) => grant.providerKey ?? grant.provider.toLowerCase()),
    );
    // Sequential: each revoke clears that identity's vault secrets, and a
    // partial failure should stop rather than race the rest.
    for (const provider of providers) {
      await readable(() => revokeProviderGrant(provider));
    }
    await refresh();
  }, [grants, refresh]);

  const beginPrivyDelegation = useCallback(
    async (family: "evm" | "svm") => {
      if (!currentThreadId) {
        throw new Error(
          "Open a chat thread before connecting Privy delegated signing.",
        );
      }
      const response = await fetch("/api/delegation/privy/begin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Thread-Id": currentThreadId,
        },
        body: JSON.stringify({ wallet_family: family }),
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        auth_url?: unknown;
        state_token?: unknown;
      } | null;
      if (
        !response.ok ||
        typeof payload?.auth_url !== "string" ||
        typeof payload.state_token !== "string"
      ) {
        throw new Error("Could not start Privy delegated signing.");
      }
      const signerId = new URL(payload.auth_url).searchParams
        .get("signer_id")
        ?.trim();
      if (!signerId) {
        throw new Error(
          "Privy delegation is missing its signer configuration.",
        );
      }
      await privyDelegation.start({ state: payload.state_token, signerId });
      await refresh();
    },
    [currentThreadId, privyDelegation, refresh],
  );

  const regrant = useCallback(
    async (wallet: WalletPolicy) => {
      if (wallet.provider?.toLowerCase() === "privy") {
        await beginPrivyDelegation(wallet.chain);
        return;
      }
      if (!openAccountUI) {
        throw new Error(
          "Reconnect this provider from the wallet menu to mint a new grant.",
        );
      }
      // Grants are born only from the provider's verified connect flow — there
      // is no server-side "re-grant". Sending the user back through the
      // provider is the real path; the reload picks up whatever it minted.
      await openAccountUI({ family: wallet.chain });
      await refresh();
    },
    [beginPrivyDelegation, openAccountUI, refresh],
  );

  return useMemo(
    () => ({
      status,
      error,
      wallets,
      grants,
      refresh,
      commitMode,
      revokeGrant,
      stopAllAuto,
      connectPrivy: () => beginPrivyDelegation("evm"),
      regrant,
      blockedReason,
      beginPrivyDelegation,
    }),
    [
      blockedReason,
      commitMode,
      error,
      grants,
      refresh,
      regrant,
      revokeGrant,
      status,
      stopAllAuto,
      wallets,
    ],
  );
}

function permitDescription(wallet: WalletPolicy, mode: SignerMode): string {
  return `Authorize "${mode}" signing for ${wallet.address} on your Aomi account.`;
}
