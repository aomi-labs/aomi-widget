import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';
import { PrivyClientConfig } from '@privy-io/react-auth';
import { Chain } from 'viem';
import { k as EvmWalletsConfig, E as ExecutionConfig, j as SvmNetworkOption, l as SvmCluster, f as AuthMethodId, g as AomiWidgetAuthConfig } from '../types-DhXmbviE.js';
export { P as PrivyDelegationContextValue, u as usePrivyDelegation } from '../privy-delegation-context-CLbNobSf.js';
import { W as WalletProviderPlugin } from '../plugin-registry-CQWSl6nq.js';
import 'wagmi';
import '@aomi-labs/react';
import '@aomi-labs/client';

type AomiPrivyProviderProps = {
    children: ReactNode;
    appId?: string;
    appName?: string;
    appLogoUrl?: string;
    networks?: readonly [Chain, ...Chain[]];
    wallets?: EvmWalletsConfig;
    loginMethods?: PrivyClientConfig["loginMethods"];
    walletConnectProjectId?: string;
    execution?: ExecutionConfig;
    solana?: {
        networks?: readonly SvmNetworkOption[];
        cluster?: SvmCluster;
        rpcHttpUrl?: string;
        rpcWsUrl?: string;
        preferDirectSend?: boolean;
    };
};
declare function AomiPrivyProvider({ networks, wallets, solana, ...rest }: AomiPrivyProviderProps): react_jsx_runtime.JSX.Element;

/**
 * Owns the one-time Auto-mode consent ceremony inside the same Privy context
 * that owns Alice's embedded wallet. The user explicitly adds Aomi's signer;
 * the callback then proves the wallet and persists the provider grant.
 */
declare function PrivyDelegationProvider({ callbackPath, children, }: {
    callbackPath?: string;
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;

declare const privyPlugin: WalletProviderPlugin;
declare function registerAomiPrivyWalletProvider(): void;

type PrivyAuthOptions = {
    appId: string;
    environment?: string;
    methods?: readonly AuthMethodId[];
    appName?: string;
    appLogoUrl?: string;
};
/**
 * Build the widget auth config for the Privy provider. Calling this is the
 * supported entry point for Privy-backed widgets.
 */
declare function privyAuth({ appId, environment, methods, appName, appLogoUrl, }: PrivyAuthOptions): AomiWidgetAuthConfig;

export { AomiPrivyProvider, type AomiPrivyProviderProps, type PrivyAuthOptions, PrivyDelegationProvider, privyAuth, privyPlugin, registerAomiPrivyWalletProvider };
