"use client";

import { useMemo, useState } from "react";
import { signOutAndDisconnect, useAomiWalletKit } from "@aomi-labs/widget-lib";
import { AccountSigningView } from "./account-signing";
import {
  AccountManagement,
  type AddSignInOption,
  type AddWalletOption,
} from "./account-management";
import { useAccountAcl } from "./use-account-acl";
import {
  buildUnifiedAccountWallets,
  isProviderSigningWallet,
  visibleSignInMethods,
  type UnifiedAccountWallet,
} from "./wallet-management-model";

/** Settings › Account is the canonical account, wallet, and signing surface. */
export function AccountSettings() {
  const adapter = useAomiWalletKit();
  const acl = useAccountAcl();
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const wallets = useMemo(
    () =>
      buildUnifiedAccountWallets({
        accounts: adapter.accounts ?? [],
        linkedWallets: adapter.accountWallets ?? [],
        policies: acl.wallets,
      }),
    [acl.wallets, adapter.accountWallets, adapter.accounts],
  );
  const signInMethods = useMemo(
    () => visibleSignInMethods(adapter.accountLinkedAccounts ?? []),
    [adapter.accountLinkedAccounts],
  );
  const providerWallets = useMemo(
    () => acl.wallets.filter(isProviderSigningWallet),
    [acl.wallets],
  );
  const addWalletOptions = useMemo<AddWalletOption[]>(
    () => [
      ...(adapter.evmWallets ?? []).map((wallet) => ({
        id: wallet.id,
        family: "evm" as const,
        label: wallet.label,
        ready: wallet.status !== "unavailable",
      })),
      ...(adapter.solanaWallets ?? []).map((wallet) => ({
        id: wallet.name,
        family: "svm" as const,
        label: wallet.name,
        ready: wallet.ready,
      })),
    ],
    [adapter.evmWallets, adapter.solanaWallets],
  );
  const addSignInOptions = useMemo<AddSignInOption[]>(
    () =>
      (adapter.socialLoginOptions ?? []).map((option) => ({
        id: option.id,
        label: option.label,
        ready: option.status !== "unavailable",
      })),
    [adapter.socialLoginOptions],
  );

  const run = async (
    key: string,
    action: () => Promise<void>,
    refresh = true,
  ) => {
    setPending(key);
    setActionError(null);
    try {
      await action();
      if (refresh) await acl.refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Something went wrong.",
      );
    } finally {
      setPending(null);
    }
  };

  const linkWallet = async (wallet: UnifiedAccountWallet) => {
    if (!wallet.connectedAccountId) return;
    await run(`link:${wallet.key}`, async () => {
      if (adapter.linkWallet) {
        await adapter.linkWallet({
          accountId: wallet.connectedAccountId,
          family: wallet.family,
          address: wallet.address,
          chainId: wallet.chainId,
        });
        return;
      }
      await acl.bindWallet({
        id: wallet.key,
        chain: wallet.family,
        address: wallet.address,
        walletName: wallet.walletName,
        provider: wallet.provider,
        active: wallet.active,
      });
    });
  };

  const unlinkWallet = async (wallet: UnifiedAccountWallet) => {
    if (!adapter.unlinkLinkedWallet || !wallet.accountWalletId) return;
    if (!window.confirm(`Unlink ${wallet.address} from this account?`)) return;
    await run(`unlink:${wallet.key}`, () =>
      adapter.unlinkLinkedWallet!(wallet.accountWalletId!),
    );
  };

  return (
    <div className="flex flex-col">
      <AccountManagement
        user={adapter.accountUser}
        wallets={wallets}
        signInMethods={signInMethods}
        addWalletOptions={addWalletOptions}
        addSignInOptions={addSignInOptions}
        pending={pending}
        error={actionError ?? (acl.status === "error" ? acl.error : null)}
        onRenameAccount={
          adapter.updateAccount
            ? async (displayName) =>
                run("account:rename", () =>
                  adapter.updateAccount!({ displayName: displayName || null }),
                )
            : undefined
        }
        onAddWallet={async (option) =>
          run(`add-wallet:${option.id}`, async () => {
            if (option.family === "evm" && adapter.connectEvmWallet) {
              await adapter.connectEvmWallet(option.id);
              return;
            }
            if (option.family === "svm" && adapter.connectSolanaWallet) {
              await adapter.connectSolanaWallet(option.id);
              return;
            }
            await adapter.connect({ family: option.family });
          })
        }
        onAddSignIn={async (option) =>
          run(`add-sign-in:${option.id}`, async () => {
            if (adapter.connectSocial) {
              await adapter.connectSocial(option.id);
              return;
            }
            await adapter.connect();
          })
        }
        onLinkWallet={linkWallet}
        onSelectWallet={async (wallet) => {
          if (!wallet.connectedAccountId) return;
          await run(`select:${wallet.key}`, () =>
            adapter.selectAccount(wallet.connectedAccountId!),
          );
        }}
        onDisconnectWallet={
          adapter.disconnect
            ? async (wallet) =>
                run(`disconnect:${wallet.key}`, () =>
                  adapter.disconnect!(
                    wallet.family === "evm" && wallet.connectedAccountId
                      ? { accountId: wallet.connectedAccountId }
                      : { family: wallet.family },
                  ),
                )
            : undefined
        }
        onUnlinkWallet={adapter.unlinkLinkedWallet ? unlinkWallet : undefined}
        onUnlinkSignIn={
          adapter.unlinkLinkedAccount
            ? async (account) => {
                if (!window.confirm(`Unlink ${account.provider} sign-in?`)) {
                  return;
                }
                await run(`unlink-identity:${account.id}`, () =>
                  adapter.unlinkLinkedAccount!(account.id),
                );
              }
            : undefined
        }
        onSignOut={async () =>
          run("account:signout", () => signOutAndDisconnect(adapter), false)
        }
        onDeleteAccount={
          adapter.deleteAccount
            ? async () => {
                if (
                  !window.confirm(
                    "Delete this Aomi account? Linked wallets and sign-in methods will be freed.",
                  )
                ) {
                  return;
                }
                await run(
                  "account:delete",
                  async () => {
                    await adapter.deleteAccount!();
                    await adapter.disconnect?.({ family: "all" });
                  },
                  false,
                );
              }
            : undefined
        }
      />

      {acl.status === "loading" ? (
        <p className="text-aomi-muted px-[22px] pb-5 text-[13px]">
          Loading provider signing settings…
        </p>
      ) : providerWallets.length || acl.needsParaAgentWallet ? (
        <div className="border-aomi-border border-t">
          <AccountSigningView
            wallets={providerWallets}
            grants={acl.grants}
            unboundWallets={[]}
            needsParaAgentWallet={acl.needsParaAgentWallet}
            onCommit={acl.commitMode}
            onBindWallet={acl.bindWallet}
            onProvisionParaAgentWallet={acl.provisionParaAgentWallet}
            onRevokeGrant={acl.revokeGrant}
            onStopAllAuto={acl.stopAllAuto}
            canConnectPrivy={acl.canConnectPrivy}
            onConnectPrivy={acl.connectPrivy}
            onRegrant={acl.regrant}
            blockedReason={acl.blockedReason}
          />
        </div>
      ) : null}
    </div>
  );
}
