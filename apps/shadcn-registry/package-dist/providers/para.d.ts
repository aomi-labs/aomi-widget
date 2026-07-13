import * as React from 'react';
import { ReactNode } from 'react';
import { j as SvmNetworkOption, E as ExecutionConfig, a as AccountConfig, h as AuthMethodId, A as AomiWidgetAuthConfig, c as AomiWalletKitProviderInput } from '../types-C79awvyc.js';
import { Chain } from 'viem';
import { TOAuthMethod, TExternalWallet } from '@getpara/react-sdk';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { W as WalletProviderPlugin } from '../plugin-registry-D5Omdaey.js';
import 'wagmi';
import '@aomi-labs/react';

type PluginSvmRuntimeConfig = Pick<{
    cluster: SvmNetworkOption["cluster"];
    rpcHttpUrl: string;
    rpcWsUrl?: string;
    preferDirectSend: boolean;
}, "cluster" | "rpcHttpUrl" | "rpcWsUrl" | "preferDirectSend">;
type AomiParaPluginProviderProps = {
    children: ReactNode;
    supportedChains?: readonly Chain[];
    svmConfig?: PluginSvmRuntimeConfig;
    selectedSolanaNetwork?: SvmNetworkOption;
    setSelectedSolanaNetworkId?: (networkId: string) => void;
    supportedSolanaNetworks?: readonly SvmNetworkOption[];
    oAuthMethods?: readonly TOAuthMethod[];
    execution?: ExecutionConfig;
    account?: AccountConfig;
};
declare function AomiParaPluginProvider({ children, supportedChains: configuredChains, svmConfig, selectedSolanaNetwork: selectedSolanaNetworkProp, setSelectedSolanaNetworkId: setSelectedSolanaNetworkIdProp, supportedSolanaNetworks: supportedSolanaNetworksProp, oAuthMethods, execution, account, }: AomiParaPluginProviderProps): react_jsx_runtime.JSX.Element;

declare const paraPlugin: WalletProviderPlugin;
declare function registerAomiParaWalletProvider(): void;

type ParaAuthOptions = {
    /** Para publishable API key. An empty value disables provider auth. */
    apiKey?: string;
    environment?: "PROD" | "BETA";
    methods?: readonly AuthMethodId[];
    appName?: string;
    appDescription?: string;
    appUrl?: string;
};
/** Configure Para auth for the unified `AomiWidget`. */
declare function paraAuth({ apiKey, environment, methods, appName, appDescription, appUrl, }: ParaAuthOptions): AomiWidgetAuthConfig;

type AomiParaProviderProps = {
    children?: ReactNode;
    appName?: string;
    appDescription?: string;
    appUrl?: string;
    apiKey?: string;
    environment?: "PROD" | "BETA";
    networks?: readonly [Chain, ...Chain[]];
    walletConnectProjectId?: string;
    externalWallets?: readonly TExternalWallet[];
    oAuthMethods?: readonly TOAuthMethod[];
};
/** @deprecated use AomiWalletKitProvider with auth={{ provider: "para" }}. */
declare function AomiParaProvider({ appDescription, appName, appUrl, apiKey, children, environment, externalWallets, networks, oAuthMethods, walletConnectProjectId, }: AomiParaProviderProps): React.FunctionComponentElement<AomiWalletKitProviderInput>;
type AomiParaAdapterProviderProps = AomiParaProviderProps;
/** @deprecated use AomiParaProvider or AomiWalletKitProvider. */
declare const AomiParaAdapterProvider: typeof AomiParaProvider;

export { AomiParaAdapterProvider, type AomiParaAdapterProviderProps, AomiParaPluginProvider, type AomiParaPluginProviderProps, AomiParaProvider, type AomiParaProviderProps, type ParaAuthOptions, paraAuth, paraPlugin, registerAomiParaWalletProvider };
