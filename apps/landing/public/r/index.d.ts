import { W as WalletAccountMenuOptions } from './aomi-widget-ChulL5f0.js';
export { A as AomiFrame, a as AomiWidget, b as AomiWidgetProps, D as DEFAULT_SIDEBAR_PRODUCTS, S as SidebarProduct } from './aomi-widget-ChulL5f0.js';
import * as React from 'react';
import { FC, ButtonHTMLAttributes, ReactNode } from 'react';
import { Chain } from 'viem';
import * as react_jsx_runtime from 'react/jsx-runtime';
import * as class_variance_authority_types from 'class-variance-authority/types';
import { VariantProps } from 'class-variance-authority';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
export { ChainInfo, ExtUserProvider, SUPPORTED_CHAINS, UserConfig, UserState, formatAddress, getChainInfo, getNetworkName, useUser } from '@aomi-labs/react';
export { megaeth, monad, monadTestnet, robinhood } from '@aomi-labs/client';
import { A as AomiWalletKit, a as AomiWalletKitProviderInput, b as AomiSessionIdentity, c as AomiLoginMethod, d as AomiWalletProvider$1, e as AuthProviderId, f as AuthMethodId, S as SvmWalletsConfig, E as ExecutionConfig } from './types-DhXmbviE.js';
export { h as AomiAuthStatus, h as AomiSessionStatus, g as AomiWidgetAuthConfig } from './types-DhXmbviE.js';
export { P as PrivyDelegationContextValue, u as usePrivyDelegation } from './privy-delegation-context-CLbNobSf.js';
import 'wagmi';

declare const buttonVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
    size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function Button({ className, variant, size, asChild, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
}): react_jsx_runtime.JSX.Element;

declare function Input({ className, type, ...props }: React.ComponentProps<"input">): react_jsx_runtime.JSX.Element;

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

type NetworkSelectProps = {
    className?: string;
    chains?: readonly Chain[];
};
declare const NetworkSelect: FC<NetworkSelectProps>;

type DualWalletBarProps = {
    families: Array<"evm" | "solana">;
    className?: string;
    onConnectionChange?: (connected: boolean) => void;
    /** Optional account menu layer — portal passes live allowance + action callbacks. */
    accountMenu?: WalletAccountMenuOptions;
};
declare const DualWalletBar: FC<DualWalletBarProps>;

declare function NotificationToaster(): react_jsx_runtime.JSX.Element;

declare function ModalBackdrop({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>): react_jsx_runtime.JSX.Element;

declare const Card: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardHeader: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardTitle: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLParagraphElement>>;
declare const CardDescription: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;
declare const CardContent: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardFooter: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;

declare function AomiWalletKitContextProvider({ children, value, }: {
    children: ReactNode;
    value: AomiWalletKit;
}): react_jsx_runtime.JSX.Element;
declare function useAomiWalletKit(): AomiWalletKit;

declare function AomiWalletKitProvider(input: AomiWalletKitProviderInput): react_jsx_runtime.JSX.Element;

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

export { AOMI_SESSION_BOOTING_IDENTITY as AOMI_AUTH_BOOTING_IDENTITY, AOMI_SESSION_DISCONNECTED_IDENTITY as AOMI_AUTH_DISCONNECTED_IDENTITY, AOMI_SESSION_BOOTING_IDENTITY, AOMI_SESSION_DISCONNECTED_IDENTITY, AomiWalletKit as AomiAuthAdapter, AomiWalletKitContextProvider as AomiAuthAdapterProvider, AomiSessionIdentity as AomiAuthIdentity, AomiBaseAccountProvider, type AomiBaseAccountProviderProps, AomiSessionIdentity, AomiWalletKit, AomiWalletKitContextProvider, AomiWalletKitProvider, AomiWalletProvider, type BaseAccountSponsorshipOptions, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DualWalletBar, type DualWalletBarProps, FullTestnetWalletRouter, Input, ModalBackdrop, NetworkSelect, type NetworkSelectProps, NotificationToaster, SidebarMenu, SidebarMenuButton, SidebarMenuItem, WalletAccountMenuOptions, formatAuthMethod, formatWalletProvider, inferAuthMethod, isFullTestnet, useAomiWalletKit as useAomiAuthAdapter, useAomiWalletKit, useFullTestnet };
