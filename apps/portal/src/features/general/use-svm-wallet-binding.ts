"use client";

import { useCallback, useEffect, useState } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import {
  ensureSvmWalletBoundVia,
  type AuthorizationPoster,
} from "@aomi-labs/client";
import { accountScopedFetch } from "@portal/lib/settings-api";

// The reusable bind mechanism (ralph row 52a). Both settings action (c) and
// the future first-commit prompt (b) drive the same ceremony through this
// hook — (b) is just "you're not bound yet; bind now" surfaced on a
// `signing_unbound_wallet` failure.

type WalletRow = { address: string; chain_type: string; signing_mode: string };

/** Read-only view of the connected Solana wallet's kernel binding. */
export type SvmBindingState =
  | { status: "no-wallet" }
  | { status: "loading" }
  | { status: "unbound" }
  | { status: "bound"; signingMode: string }
  | { status: "error"; message: string };

const BIND_DESCRIPTION =
  "Bind this Solana wallet to your Aomi account so it can sign transactions.";

/** Same-origin poster: the portal proxy injects the AccountBearer from the
 * `aomi_session` cookie, so the ceremony rides the account-scoped path. */
const post: AuthorizationPoster = (path, body) =>
  accountScopedFetch(path, { method: "POST", body: JSON.stringify(body) });

export function useSvmWalletBinding(): {
  state: SvmBindingState;
  /** True while a bind ceremony is in flight. */
  binding: boolean;
  /** True when a wallet is connected and can sign a bind message. */
  canBind: boolean;
  bind: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const adapter = useAomiAuthAdapter();
  const svmAddress = adapter.identity.svmAddress;
  const cluster = adapter.identity.solanaCluster;
  const signSolanaMessage = adapter.signSolanaMessage;
  const canSignMessage =
    adapter.identity.solanaCapabilities?.canSignMessage ?? true;

  const [state, setState] = useState<SvmBindingState>({ status: "no-wallet" });
  const [binding, setBinding] = useState(false);

  const refresh = useCallback(async () => {
    if (!svmAddress) {
      setState({ status: "no-wallet" });
      return;
    }
    setState({ status: "loading" });
    try {
      const data = await accountScopedFetch<{ wallets: WalletRow[] }>(
        "/api/account/wallets",
      );
      const row = data.wallets.find(
        (wallet) =>
          wallet.chain_type.toLowerCase() === "svm" &&
          wallet.address === svmAddress,
      );
      setState(
        row
          ? { status: "bound", signingMode: row.signing_mode }
          : { status: "unbound" },
      );
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load",
      });
    }
  }, [svmAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bind = useCallback(async () => {
    if (!svmAddress || !signSolanaMessage) {
      return;
    }
    setBinding(true);
    try {
      const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
        const { signature } = await signSolanaMessage({
          message: bytesToBase64(message),
          cluster,
          description: BIND_DESCRIPTION,
        });
        return base64ToBytes(signature);
      };
      await ensureSvmWalletBoundVia(post, svmAddress, signMessage);
      await refresh();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Bind failed",
      });
    } finally {
      setBinding(false);
    }
  }, [svmAddress, signSolanaMessage, cluster, refresh]);

  return {
    state,
    binding,
    canBind: Boolean(svmAddress && signSolanaMessage && canSignMessage),
    bind,
    refresh,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
