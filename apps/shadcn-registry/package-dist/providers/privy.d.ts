import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';
import { PrivyClientConfig } from '@privy-io/react-auth';
import { Chain } from 'viem';
import { k as EvmWalletsConfig, E as ExecutionConfig, j as SvmNetworkOption, l as SvmCluster, h as AuthMethodId, A as AomiWidgetAuthConfig } from '../types-C79awvyc.js';
import { W as WalletProviderPlugin } from '../plugin-registry-D5Omdaey.js';
import 'wagmi';
import '@aomi-labs/react';

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

declare const privyPlugin: WalletProviderPlugin;
declare function registerAomiPrivyWalletProvider(): void;

type PrivyAuthOptions = {
    /** Privy publishable app id. An empty value disables provider auth. */
    appId?: string;
    methods?: readonly AuthMethodId[];
    appName?: string;
    appLogoUrl?: string;
};
/** Configure Privy auth for the unified `AomiWidget`. */
declare function privyAuth({ appId, methods, appName, appLogoUrl, }: PrivyAuthOptions): AomiWidgetAuthConfig;

export { AomiPrivyProvider, type AomiPrivyProviderProps, type PrivyAuthOptions, privyAuth, privyPlugin, registerAomiPrivyWalletProvider };
