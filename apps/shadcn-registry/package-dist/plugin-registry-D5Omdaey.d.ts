import { ReactNode } from 'react';
import { m as AuthConfig, P as ProvidersConfig, a as AccountConfig, E as ExecutionConfig, j as SvmNetworkOption, c as AomiWalletKitProviderInput, n as AomiWalletKitProviderProps } from './types-C79awvyc.js';
import { Chain } from 'viem';

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
