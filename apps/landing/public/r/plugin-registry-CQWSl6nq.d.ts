import { ReactNode } from 'react';
import { m as EvmWalletPreset, n as EvmWalletId, o as AuthConfig, P as ProvidersConfig, i as AccountConfig, E as ExecutionConfig, j as SvmNetworkOption, a as AomiWalletKitProviderInput, p as AomiWalletKitProviderProps } from './types-DhXmbviE.js';
import { Chain, Transport } from 'viem';
import { CreateConnectorFn } from 'wagmi';

type ResolvedEvmWalletsConfig = {
    chains: readonly [Chain, ...Chain[]];
    preset?: EvmWalletPreset;
    wallets?: readonly EvmWalletId[];
    connectors?: readonly CreateConnectorFn[];
    walletConnectProjectId?: string;
    coinbase?: boolean;
    appName?: string;
    appLogoUrl?: string | null;
    transports?: Record<number, Transport>;
    ssr?: boolean;
    includeBaseAccount?: boolean;
};

/**
 * A wallet provider plugin. Knows how to render itself from the normalized
 * capability config, and optionally how to recognize its ergonomic sugar form.
 * Registering one lets `AomiWalletKitProvider` resolve a provider by id instead
 * of branching on hardcoded provider names — adding a provider is a
 * `registerWalletProvider(...)` call, not a new `if` in the router.
 *
 */
type WalletProviderPlugin = {
    id: string;
    authMode?: "additive" | "full";
    wrap?: (props: {
        auth?: AuthConfig;
        children: ReactNode;
        providers?: ProvidersConfig;
    }) => ReactNode;
    isAvailable?: (props: {
        auth?: AuthConfig;
        providers?: ProvidersConfig;
    }) => boolean;
    renderEvmRuntimeProvider?: (props: {
        children: ReactNode;
        config: ResolvedEvmWalletsConfig;
    }) => ReactNode;
    renderComposer?: (props: {
        account?: AccountConfig;
        auth?: AuthConfig;
        children: ReactNode;
        execution?: ExecutionConfig;
        providers?: ProvidersConfig;
        solanaRuntimeConfig?: {
            cluster: SvmNetworkOption["cluster"];
            rpcHttpUrl: string;
            rpcWsUrl?: string;
            preferDirectSend: boolean;
        };
        supportedChains: readonly Chain[];
        supportedSolanaNetworks: readonly SvmNetworkOption[];
        selectedSolanaNetwork?: SvmNetworkOption;
        setSelectedSolanaNetworkId: (networkId: string) => void;
    }) => ReactNode;
    detectSugar?: (input: AomiWalletKitProviderInput) => AomiWalletKitProviderProps | null;
};

export type { WalletProviderPlugin as W };
