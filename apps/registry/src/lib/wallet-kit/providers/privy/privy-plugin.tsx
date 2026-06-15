"use client";

import {
  registerWalletProvider,
  type WalletProviderPlugin,
} from "../plugin-registry";
import { AomiPrivyProvider } from "./privy";

export const privyPlugin: WalletProviderPlugin = {
  id: "privy",
  render: (props) => {
    const privy =
      props.providers?.privy === false ? undefined : props.providers?.privy;
    const auth =
      props.auth !== false && props.auth?.provider === "privy"
        ? props.auth
        : undefined;
    const evmWallets =
      props.wallets?.evm === false ? undefined : props.wallets?.evm;
    return (
      <AomiPrivyProvider
        appId={privy?.appId}
        appName={privy?.appName}
        appLogoUrl={privy?.appLogoUrl}
        execution={props.execution}
        networks={evmWallets?.chains}
        wallets={evmWallets}
        walletConnectProjectId={evmWallets?.walletConnectProjectId}
        loginMethods={auth?.methods as never}
        solana={
          props.wallets?.solana === false ? undefined : props.wallets?.solana
        }
      >
        {props.children}
      </AomiPrivyProvider>
    );
  },
  detectSugar: (input) => {
    if (
      input.auth !== false &&
      input.auth?.provider === "privy" &&
      "appId" in input.auth
    ) {
      return {
        children: input.children,
        providers: {
          privy: {
            appId: input.auth.appId,
            appName: input.auth.appName,
          },
        },
        auth: { provider: "privy", methods: input.auth.methods },
      };
    }
    return null;
  },
};

export function registerAomiPrivyWalletProvider(): void {
  registerWalletProvider(privyPlugin);
}
