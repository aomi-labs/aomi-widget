"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useModalStatus,
  usePrivy,
  useSessionSigners,
} from "@privy-io/react-auth";
import { PrivyDelegationContext } from "./privy-delegation-context";

/**
 * The Privy delegation ceremony.
 *
 * This lives in the wallet kit rather than in a consuming app because it must
 * observe the SAME Privy context as {@link PrivyAuthLayer}'s `PrivyProvider`.
 * React context identity is per module instance, so a copy of this component
 * that resolved a different `@privy-io/react-auth` install would silently read
 * the SDK's *default* context — `ready: false`, `authenticated: false`, and a
 * no-op `login` — and the ceremony would stall with no modal and no error.
 * Keeping it beside the provider makes that impossible.
 */

type EmbeddedEvmWallet = {
  address: string;
  id: string;
  chainType?: string;
  imported?: boolean;
  walletClientType?: string;
};

type PendingDelegation = {
  id: number;
  state: string;
  signerId: string;
  resolve: () => void;
  reject: (error: Error) => void;
};

function embeddedEvmWallet(user: unknown): EmbeddedEvmWallet | null {
  if (!user || typeof user !== "object") return null;
  const record = user as { wallet?: unknown; linkedAccounts?: unknown[] };
  const candidates = [record.wallet, ...(record.linkedAccounts ?? [])];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const wallet = candidate as Partial<EmbeddedEvmWallet>;
    if (
      typeof wallet.id === "string" &&
      typeof wallet.address === "string" &&
      /^0x[0-9a-fA-F]{40}$/.test(wallet.address) &&
      wallet.imported !== true &&
      (wallet.chainType === undefined ||
        wallet.chainType === "ethereum" ||
        wallet.chainType === "evm") &&
      (wallet.walletClientType === undefined ||
        wallet.walletClientType === "privy" ||
        wallet.walletClientType === "privy-v2")
    ) {
      return wallet as EmbeddedEvmWallet;
    }
  }
  return null;
}

/**
 * Runs the Privy delegation ceremony within the app's one root PrivyProvider.
 * `login()` opens Privy's native modal; no popup window or second provider is
 * needed. The signed state remains in memory until the callback succeeds.
 *
 * An already-authenticated user with an already-delegated wallet sees no modal
 * at all — Privy has nothing left to ask — and the ceremony completes straight
 * through to the callback. That is success, not a stall.
 */
export function PrivyDelegationProvider({
  callbackPath = "/api/delegation/privy/callback",
  children,
}: {
  /** BFF route that verifies the state token and persists the grant. */
  callbackPath?: string;
  children: ReactNode;
}) {
  const { authenticated, getAccessToken, login, ready, user } = usePrivy();
  const { addSessionSigners } = useSessionSigners();
  const { isOpen: modalOpen } = useModalStatus();
  const [pending, setPending] = useState<PendingDelegation | null>(null);
  const pendingRef = useRef<PendingDelegation | null>(null);
  const sequence = useRef(0);
  const loginStarted = useRef<number | null>(null);
  const signerStarted = useRef<number | null>(null);
  const modalWasOpen = useRef(false);

  const settle = useCallback((id: number, error?: Error) => {
    const operation = pendingRef.current;
    if (!operation || operation.id !== id) return;
    pendingRef.current = null;
    setPending(null);
    if (error) operation.reject(error);
    else operation.resolve();
  }, []);

  const openLogin = useCallback(
    (operation: PendingDelegation) => {
      if (loginStarted.current === operation.id) return;
      loginStarted.current = operation.id;
      try {
        // `login` synchronously opens Privy's native modal. Invoke it from the
        // initiating interaction whenever the SDK is ready rather than waiting
        // for a later render effect (which can lose the browser interaction).
        login();
      } catch (error) {
        settle(
          operation.id,
          error instanceof Error
            ? error
            : new Error("Privy login could not be opened."),
        );
      }
    },
    [login, settle],
  );

  const start = useCallback(
    ({ signerId, state }: { state: string; signerId: string }) =>
      new Promise<void>((resolve, reject) => {
        if (pendingRef.current) {
          reject(new Error("A Privy delegation is already in progress."));
          return;
        }
        const operation: PendingDelegation = {
          id: ++sequence.current,
          state,
          signerId,
          resolve,
          reject,
        };
        pendingRef.current = operation;
        setPending(operation);
        if (ready && !authenticated) openLogin(operation);
      }),
    [authenticated, openLogin, ready],
  );

  // There is no `usePrivy().error` to observe here, so a sign-in the user backs
  // out of would leave the ceremony pending forever. Watch the modal instead:
  // once it has opened for this operation and closed again with no session, the
  // user dismissed it.
  useEffect(() => {
    if (!pending) {
      modalWasOpen.current = false;
      return;
    }
    if (modalOpen) {
      modalWasOpen.current = true;
      return;
    }
    if (modalWasOpen.current && !authenticated) {
      modalWasOpen.current = false;
      settle(pending.id, new Error("Privy sign-in was dismissed."));
    }
  }, [authenticated, modalOpen, pending, settle]);

  useEffect(() => {
    if (!pending) return;
    if (!ready) return;
    if (!authenticated) {
      openLogin(pending);
      return;
    }
    if (signerStarted.current === pending.id) return;
    const wallet = embeddedEvmWallet(user);
    if (!wallet) {
      settle(
        pending.id,
        new Error("Privy did not create an embedded Ethereum wallet."),
      );
      return;
    }
    signerStarted.current = pending.id;
    void (async () => {
      // Kept so a failed callback can explain itself: re-granting an
      // already-authorized wallet throws here in the normal case, so this is
      // only worth reporting once the authoritative step has also failed.
      let addSignersError: unknown;
      try {
        try {
          await addSessionSigners({
            address: wallet.address,
            signers: [{ signerId: pending.signerId, policyIds: [] }],
          });
        } catch (error) {
          // Re-granting an already-authorized wallet is expected. The backend
          // callback verifies the signer before persisting anything, so keep
          // that authoritative check rather than treating this as a failure.
          addSignersError = error;
        }
        const accessToken = await getAccessToken();
        if (!accessToken || !user?.id) {
          throw new Error("Privy did not provide an access token.");
        }
        const response = await fetch(callbackPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            state: pending.state,
            access_token: accessToken,
            user_id: user.id,
            wallets: [
              {
                id: wallet.id,
                address: wallet.address,
                chain_type: "ethereum",
              },
            ],
          }),
        });
        if (!response.ok) {
          const because =
            addSignersError instanceof Error
              ? ` Privy also rejected the signer: ${addSignersError.message}`
              : "";
          throw new Error(
            `Aomi could not save the delegation (HTTP ${response.status}).${because}`,
          );
        }
        settle(pending.id);
      } catch (error) {
        settle(
          pending.id,
          error instanceof Error
            ? error
            : new Error("Privy delegation failed."),
        );
      }
    })();
  }, [
    addSessionSigners,
    authenticated,
    callbackPath,
    getAccessToken,
    openLogin,
    pending,
    ready,
    settle,
    user,
  ]);

  useEffect(() => {
    if (!pending || ready) return;
    const timer = globalThis.setTimeout(
      () =>
        settle(
          pending.id,
          new Error(
            "Privy is still loading. Disable privacy/ad-blocking extensions and try again.",
          ),
        ),
      12_000,
    );
    return () => globalThis.clearTimeout(timer);
  }, [pending, ready, settle]);

  return (
    <PrivyDelegationContext.Provider value={{ start }}>
      {children}
    </PrivyDelegationContext.Provider>
  );
}
