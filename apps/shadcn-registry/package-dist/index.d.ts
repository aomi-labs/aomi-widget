import * as React from 'react';
import { ReactNode, FC, CSSProperties } from 'react';
import { AomiClientOptions } from '@aomi-labs/react';
export { ChainInfo, ExtUserProvider, SUPPORTED_CHAINS, UserConfig, UserState, formatAddress, getChainInfo, getNetworkName, useUser } from '@aomi-labs/react';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { A as AomiWidgetAuthConfig, P as ProvidersConfig, W as WalletsConfig, E as ExecutionConfig, a as AccountConfig, b as AomiWalletKit, c as AomiWalletKitProviderInput, d as AomiSessionIdentity, e as AomiLoginMethod, f as AomiWalletProvider$1, g as AuthProviderId, h as AuthMethodId, S as SvmWalletsConfig } from './types-C79awvyc.js';
export { i as AomiAuthStatus, i as AomiSessionStatus } from './types-C79awvyc.js';
import * as class_variance_authority_types from 'class-variance-authority/types';
import { VariantProps } from 'class-variance-authority';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
export { monad, monadTestnet } from '@aomi-labs/client';
import { Chain } from 'viem';
import 'wagmi';

type ControlBarProps = {
    className?: string;
    /** Custom controls to render alongside built-in ones */
    children?: ReactNode;
    /** Hide the model selector */
    hideModel?: boolean;
    /** Hide the App selector */
    hideApp?: boolean;
    /** Hide the API key input */
    hideApiKey?: boolean;
    /** Hide the wallet connect button (default: true) */
    hideWallet?: boolean;
    /** Hide the network selector (default: false) */
    hideNetwork?: boolean;
    /** Hide the secrets input */
    hideSecrets?: boolean;
};

type RootProps = {
    children?: ReactNode;
    width?: CSSProperties["width"];
    height?: CSSProperties["height"];
    className?: string;
    style?: CSSProperties;
    /** Position of the wallet button in the sidebar */
    walletPosition?: "header" | "footer" | null;
    /** Which wallet families to show as dual slots (omit for single-family mode) */
    walletFamilies?: Array<"evm" | "solana">;
    /** Whether to show the thread list sidebar (default: true) */
    showSidebar?: boolean;
    /** Backend URL for the Aomi runtime */
    backendUrl?: string;
    /** Optional runtime client overrides. */
    clientOptions?: Omit<AomiClientOptions, "baseUrl">;
    /** Persist the active materialized thread in localStorage. Defaults to true. */
    persistThread?: boolean;
    /** Full localStorage key override for vendors that need exact isolation. */
    threadPersistenceKey?: string;
    /** Extra key segment for tenant/user/app scoping without owning the full key. */
    threadPersistenceScope?: string | null;
};
type HeaderProps = {
    children?: ReactNode;
    /** Show the control bar in the header */
    withControl?: boolean;
    /** Props to pass to the ControlBar when withControl is true */
    controlBarProps?: Omit<ControlBarProps, "children">;
    /** Whether to show the sidebar toggle button (default: true) */
    showSidebarTrigger?: boolean;
    className?: string;
};
type ComposerProps = {
    children?: ReactNode;
    /** Show inline controls in the composer input area */
    withControl?: boolean;
    /** Props to pass to the ControlBar when withControl is true */
    controlBarProps?: Omit<ControlBarProps, "children">;
    className?: string;
};
type FrameControlBarProps = ControlBarProps;
type DefaultLayoutProps = Omit<RootProps, "children">;
declare const AomiFrame: FC<DefaultLayoutProps> & {
    Root: FC<RootProps>;
    Header: FC<HeaderProps>;
    Composer: FC<ComposerProps>;
    ControlBar: FC<ControlBarProps>;
};

type AomiWidgetProps = {
    /** Portal/BFF URL used for auth, accounts, threads, and chat traffic. */
    apiUrl: string;
    width?: CSSProperties["width"];
    height?: CSSProperties["height"];
    className?: string;
    style?: CSSProperties;
    walletPosition?: "header" | "footer" | null;
    walletFamilies?: Array<"evm" | "solana">;
    showSidebar?: boolean;
    showHeader?: boolean;
    controlBarProps?: Omit<FrameControlBarProps, "children">;
    clientOptions?: Omit<AomiClientOptions, "baseUrl">;
    persistThread?: boolean;
    threadPersistenceKey?: string;
    threadPersistenceScope?: string | null;
    /** Provider auth is optional; omit it for external-wallet/SIWE-only use. */
    auth?: AomiWidgetAuthConfig;
    providers?: ProvidersConfig;
    wallets?: WalletsConfig;
    execution?: ExecutionConfig;
    account?: AccountConfig;
};
/**
 * Complete Aomi chat widget with wallet/auth defaults.
 *
 * Choose provider auth with a lightweight helper such as `paraAuth(...)` or
 * `privyAuth(...)`, or omit it for an external-wallet/SIWE-only integration.
 */
declare function AomiWidget({ apiUrl, width, height, className, style, walletPosition, walletFamilies, showSidebar, showHeader, controlBarProps, clientOptions, persistThread, threadPersistenceKey, threadPersistenceScope, auth, providers, wallets, execution, account, }: AomiWidgetProps): react_jsx_runtime.JSX.Element;

type DualWalletBarProps = {
    families: Array<"evm" | "solana">;
    className?: string;
    onConnectionChange?: (connected: boolean) => void;
};
declare const DualWalletBar: FC<DualWalletBarProps>;

declare function NotificationToaster(): react_jsx_runtime.JSX.Element;

declare const buttonVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
    size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function Button({ className, variant, size, asChild, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
}): react_jsx_runtime.JSX.Element;

declare function Input({ className, type, ...props }: React.ComponentProps<"input">): react_jsx_runtime.JSX.Element;

declare const Card: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardHeader: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardTitle: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLParagraphElement>>;
declare const CardDescription: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;
declare const CardContent: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardFooter: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;

declare function TooltipContent({ className, sideOffset, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>): react_jsx_runtime.JSX.Element;

declare function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">): react_jsx_runtime.JSX.Element;
declare function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">): react_jsx_runtime.JSX.Element;
declare const sidebarMenuButtonVariants: (props?: ({
    variant?: "default" | "outline" | null | undefined;
    size?: "default" | "sm" | "lg" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function SidebarMenuButton({ asChild, isActive, variant, size, tooltip, className, ...props }: React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>): react_jsx_runtime.JSX.Element;

declare function AomiWalletKitContextProvider({ children, value, }: {
    children: ReactNode;
    value: AomiWalletKit;
}): react_jsx_runtime.JSX.Element;
declare function useAomiWalletKit(): AomiWalletKit;

declare function AomiWalletKitProvider(input: AomiWalletKitProviderInput): react_jsx_runtime.JSX.Element | null;

declare const AOMI_SESSION_DISCONNECTED_IDENTITY: AomiSessionIdentity;
declare const AOMI_SESSION_BOOTING_IDENTITY: AomiSessionIdentity;
declare function formatWalletProvider(provider?: AomiWalletProvider$1 | AuthProviderId): string | undefined;
declare function formatAuthMethod(method?: AomiLoginMethod): string | undefined;
declare function inferAuthMethod(authMethods: unknown): AomiLoginMethod | undefined;

declare function isFullTestnet(): boolean;
declare function useFullTestnet<T extends readonly [Chain, ...Chain[]]>(chains: T): {
    enabled: boolean;
    routedChains: T;
    routedChainIds: ReadonlySet<number>;
};

type FullTestnetWalletRouterProps = {
    enabled: boolean;
    chains: readonly Chain[];
    routedChainIds: ReadonlySet<number>;
    logLabel?: string;
    children?: ReactNode;
};
declare function FullTestnetWalletRouter({ enabled, chains, routedChainIds, logLabel, children, }: FullTestnetWalletRouterProps): react_jsx_runtime.JSX.Element;

type AomiWalletProviderProps = AomiWalletKitProviderInput | (AomiWalletKitProviderInput & {
    /** @deprecated use AomiWalletKitProvider preset/auth config. */
    provider?: "para" | "privy" | (string & {});
    apiKey?: string;
    environment?: "PROD" | "BETA" | (string & {});
    appName?: string;
    appDescription?: string;
    appUrl?: string;
    networks?: readonly [Chain, ...Chain[]];
    walletConnectProjectId?: string;
    externalWallets?: readonly string[];
    oAuthMethods?: readonly AuthMethodId[];
    solana?: SvmWalletsConfig | false;
});
/** @deprecated use AomiWalletKitProvider. */
declare function AomiWalletProvider(props: AomiWalletProviderProps): react_jsx_runtime.JSX.Element;

type BaseAccountSponsorshipOptions = ExecutionConfig["sponsorship"];
type AomiBaseAccountProviderProps = {
    children: ReactNode;
    appName: string;
    appLogoUrl?: string | null;
    chains?: readonly [Chain, ...Chain[]];
    includeBaseSepolia?: boolean;
    sponsorship?: BaseAccountSponsorshipOptions;
};
/** @deprecated use AomiWalletKitProvider with wallets.evm.wallets=["baseAccount"]. */
declare function AomiBaseAccountProvider({ appLogoUrl, appName, chains, children, includeBaseSepolia, sponsorship, }: AomiBaseAccountProviderProps): react_jsx_runtime.JSX.Element;

export { AOMI_SESSION_BOOTING_IDENTITY as AOMI_AUTH_BOOTING_IDENTITY, AOMI_SESSION_DISCONNECTED_IDENTITY as AOMI_AUTH_DISCONNECTED_IDENTITY, AOMI_SESSION_BOOTING_IDENTITY, AOMI_SESSION_DISCONNECTED_IDENTITY, AomiWalletKit as AomiAuthAdapter, AomiWalletKitContextProvider as AomiAuthAdapterProvider, AomiSessionIdentity as AomiAuthIdentity, AomiBaseAccountProvider, type AomiBaseAccountProviderProps, AomiFrame, AomiSessionIdentity, AomiWalletKit, AomiWalletKitContextProvider, AomiWalletKitProvider, AomiWalletProvider, AomiWidget, AomiWidgetAuthConfig, type AomiWidgetProps, type BaseAccountSponsorshipOptions, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DualWalletBar, type DualWalletBarProps, FullTestnetWalletRouter, Input, NotificationToaster, SidebarMenu, SidebarMenuButton, SidebarMenuItem, formatAuthMethod, formatWalletProvider, inferAuthMethod, isFullTestnet, useAomiWalletKit as useAomiAuthAdapter, useAomiWalletKit, useFullTestnet };
