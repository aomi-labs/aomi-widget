/** Optional account-menu layer for the sidebar wallet chip (portal supplies live data). */
export type WalletAccountMenuOptions = {
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
