import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode, FC, CSSProperties } from 'react';
import { AomiClientOptions } from '@aomi-labs/react';
import { g as AomiWidgetAuthConfig, P as ProvidersConfig, W as WalletsConfig, E as ExecutionConfig, i as AccountConfig } from './types-DhXmbviE.js';

/** Optional account-menu layer for the sidebar wallet chip (portal supplies live data). */
type WalletAccountMenuOptions = {
    /** When true, a connected chip opens AccountMenu instead of WalletPicker. */
    enabled?: boolean;
    /** Second line on the chip (e.g. monthly allowance). Omit to show network detail. */
    secondaryLine?: string;
    /**
     * Full-length problem description. The chip only has room for one truncated
     * line, so anything longer than a few words belongs here — the menu renders
     * it wrapped instead of clipping it mid-sentence.
     */
    noticeLine?: string;
    /** Menu header wallet label (e.g. MetaMask, Para). */
    walletLabel?: string;
    /** Shown on the Switch network row trailing label. */
    networkLabel?: string;
    /** Shown on the Theme row trailing label. */
    themeLabel?: string;
    onSwitchNetwork?: () => void;
    onToggleTheme?: () => void;
    onOpenSettings?: () => void;
    onOpenDeployments?: () => void;
    /** Finish Aomi account sign-in (wallet connected, session missing). */
    onSignIn?: () => void;
    /**
     * Called after disconnect confirm. Omit to use the canonical sign-out:
     * Aomi account/widget session teardown first, then wallet disconnect.
     */
    onDisconnect?: () => void | Promise<void>;
};

/** One entry in the wordmark dropdown (an Aomi surface the user can switch to). */
type SidebarProduct = {
    id: string;
    /** Badge rendered next to the wordmark when this product is the current one. */
    badge: string;
    label: string;
    description?: string;
    href: string;
};
declare const DEFAULT_SIDEBAR_PRODUCTS: SidebarProduct[];

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
    /** Optional account menu on the sidebar wallet chip (portal supplies live data). */
    walletAccountMenu?: WalletAccountMenuOptions;
    /** Products in the sidebar wordmark dropdown. Pass `null` for a plain wordmark. */
    products?: SidebarProduct[] | null;
    /** Which product this frame is, for the wordmark badge (default: "chat"). */
    currentProductId?: string;
    /** Whether to show the thread list sidebar (default: true) */
    showSidebar?: boolean;
    /** Whether the thread list sidebar starts expanded (default: true) */
    defaultSidebarOpen?: boolean;
    /** Backend URL for the Aomi runtime */
    backendUrl?: string;
    /** Concrete hosted application used to isolate runtime and persisted threads. */
    applicationId?: number | string | null;
    /** Optional runtime client overrides. */
    clientOptions?: Omit<AomiClientOptions, "baseUrl">;
    /** Whether an account session can load thread history without a wallet. */
    accountSessionAvailable?: boolean;
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
    /** Optional empty-state title shown beneath the Aomi mark. */
    welcomeTitle?: string;
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
    children?: ReactNode;
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
    clientOptions?: Omit<AomiClientOptions, "baseUrl" | "getAccountBearer">;
    persistThread?: boolean;
    threadPersistenceKey?: string;
    threadPersistenceScope?: string | null;
    auth?: AomiWidgetAuthConfig;
    providers?: ProvidersConfig;
    wallets?: WalletsConfig;
    execution?: ExecutionConfig;
    account?: AccountConfig;
};
declare function AomiWidget(props: AomiWidgetProps): react_jsx_runtime.JSX.Element;

export { AomiFrame as A, DEFAULT_SIDEBAR_PRODUCTS as D, type SidebarProduct as S, type WalletAccountMenuOptions as W, AomiWidget as a, type AomiWidgetProps as b };
