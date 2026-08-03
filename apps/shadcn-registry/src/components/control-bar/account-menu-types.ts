/** Optional account-menu layer for the sidebar wallet chip (portal supplies live data). */
export type WalletAccountMenuOptions = {
  /** When true, a connected chip opens AccountMenu instead of WalletPicker. */
  enabled?: boolean;
  /** Second line on the chip (e.g. monthly allowance). Omit to show network detail. */
  secondaryLine?: string;
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
  /** Called after disconnect confirm. Falls back to wallet-kit disconnect. */
  onDisconnect?: () => void | Promise<void>;
};
