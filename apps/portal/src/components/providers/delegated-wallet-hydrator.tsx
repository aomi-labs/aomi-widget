"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { useAomiSession } from "./aomi-session-bridge";

type AccountWalletFamily = "evm" | "svm";

type AccountWallet = {
  address: string;
  chain_type: AccountWalletFamily;
  signing: "delegated" | "client";
  is_primary: boolean;
};

// Default cluster for a hydrated Solana operating address. The delegated grant
// is chain-agnostic, so we mirror the backend's prior fallback (mainnet) rather
// than leave `domain.svm.cluster` null (which the svm tools reject). The user's
// own cluster selection (yellow), when one exists, rides `identity` and wins.
const DEFAULT_SVM_CLUSTER = "solana:mainnet";

function pickPrimary(
  wallets: readonly AccountWallet[],
  family: AccountWalletFamily,
): AccountWallet | undefined {
  const ofFamily = wallets.filter((wallet) => wallet.chain_type === family);
  return ofFamily.find((wallet) => wallet.is_primary) ?? ofFamily[0];
}

/**
 * Portal blue→yellow gap-fill for backend-signed (delegated) wallets.
 *
 * The Para/wagmi adapter only knows the wallet the user connected client-side;
 * a Privy-delegated grant (e.g. byreal's Solana signer) lives server-side and
 * never reaches `identity`. Once the BFF session cookie exists (`status` is
 * `ready`), this fetches the account's operable wallets through the same-origin
 * proxy — which injects the AccountBearer — and fills any operating address the
 * adapter did not supply, so the backend dispatch sources it from `UserState`
 * instead of its transitional grant fallback.
 *
 * Gap-fill only: it never overrides an adapter-supplied address, and it
 * re-asserts on the same `identity` deps `AomiAuthAdapterSync` runs on, so the
 * two writers never fight. A no-op when the adapter already covers every family.
 */
export function DelegatedWalletHydrator() {
  const { status } = useAomiSession();
  const { identity } = useAomiAuthAdapter();
  const { setUser } = useUser();

  const [wallets, setWallets] = useState<readonly AccountWallet[] | null>(null);
  const fetchedRef = useRef(false);

  // Fetch the account's operable wallets once, after the session is ready.
  useEffect(() => {
    if (status !== "ready") {
      fetchedRef.current = false;
      setWallets(null);
      return;
    }
    if (fetchedRef.current) {
      return;
    }
    fetchedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/account/wallets", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { wallets?: AccountWallet[] };
        if (!cancelled) {
          setWallets(body.wallets ?? []);
        }
      } catch {
        // Best-effort: the backend grant fallback still resolves the signer.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  // Fill operating addresses the adapter did not supply. Keyed on the same
  // `identity` fields the adapter sync uses, so a hydrated address is re-asserted
  // immediately after any adapter-driven `setUser`.
  useEffect(() => {
    if (status !== "ready" || !wallets || !identity.isConnected) {
      return;
    }

    const evmAddress = identity.address
      ? undefined
      : pickPrimary(wallets, "evm")?.address;
    const svmAddress = identity.svmAddress
      ? undefined
      : pickPrimary(wallets, "svm")?.address;

    if (!evmAddress && !svmAddress) {
      return;
    }

    setUser({
      ...(evmAddress ? { evm: [{ address: evmAddress }] } : {}),
      ...(svmAddress
        ? { svm: { address: svmAddress, cluster: DEFAULT_SVM_CLUSTER } }
        : {}),
    });
  }, [
    status,
    wallets,
    identity.isConnected,
    identity.address,
    identity.svmAddress,
    setUser,
  ]);

  return null;
}
