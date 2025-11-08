// WalletManager - Handles wallet connection and transactions

import { EventEmitter } from 'eventemitter3';
import type { Address } from 'viem';
import {
  connect as wagmiConnect,
  disconnect as wagmiDisconnect,
  getAccount as wagmiGetAccount,
  getBalance as wagmiGetBalance,
  getConnectors as wagmiGetConnectors,
  reconnect as wagmiReconnect,
  sendTransaction as wagmiSendTransaction,
  signMessage as wagmiSignMessage,
  switchChain as wagmiSwitchChain,
  watchAccount,
  watchChainId,
  type Config,
  type Connector,
  type GetAccountReturnType,
} from '@wagmi/core';
import type {
  EthereumProvider,
  SupportedChainId,
  AomiChatError,
} from '../types';
import {
  createWalletError,
  createTransactionError,
} from '../types/errors';
import { SUPPORTED_CHAINS, ERROR_CODES } from '../types/constants';
import { isEthereumAddress, isTransactionHash } from '../utils';
import {
  type TransactionRequest,
  validateTransactionPayload,
} from '../utils/helper';
import { createWidgetWagmiClient } from './wagmiConfig';

/*
 * ============================================================================
 * TYPES
 * ============================================================================
 */

interface WalletManagerEvents {
  connect: (_address: string) => void;
  disconnect: () => void;
  chainChange: (_chainId: SupportedChainId) => void;
  accountsChange: (_accounts: string[]) => void;
  error: (_error: AomiChatError) => void;
}

/*
 * ============================================================================
 * WALLET MANAGER CLASS
 * ============================================================================
 */

export class WalletManager extends EventEmitter<WalletManagerEvents> {
  private provider?: EthereumProvider;
  private currentAccount: string | null = null;
  private currentChainId: SupportedChainId | null = null;
  private isConnected = false;
  private wagmiConfig!: Config;
  private preferredConnectorId?: string;
  private unwatchAccount?: () => void;
  private unwatchChain?: () => void;

  constructor(provider: EthereumProvider) {
    super();
    this.provider = provider;
    this.initializeWagmiClient();
  }

  /*
   * ============================================================================
   * PUBLIC API
   * ============================================================================
   */

  /**
   * Gets the current connected account
   */
  public getCurrentAccount(): string | null {
    return this.currentAccount;
  }

  /**
   * Gets the current chain ID
   */
  public getCurrentChainId(): SupportedChainId | null {
    return this.currentChainId;
  }

  /**
   * Gets the current network name
   */
  public getCurrentNetworkName(): string | null {
    if (!this.currentChainId) return null;
    return SUPPORTED_CHAINS[this.currentChainId] || 'Unknown Network';
  }

  /**
   * Checks if wallet is connected
   */
  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Connects to the wallet
   */
  public async connect(): Promise<string> {
    try {
      const connector = this.selectConnector();
      if (!connector) {
        throw createWalletError(
          ERROR_CODES.PROVIDER_ERROR,
          'No wallet connectors are available',
        );
      }

      const result = await wagmiConnect(this.wagmiConfig, { connector });
      const account = result.accounts[0];

      if (!account || !isEthereumAddress(account)) {
        throw createWalletError(
          ERROR_CODES.WALLET_CONNECTION_FAILED,
          'No accounts returned from wallet',
        );
      }

      return account;

    } catch (error: any) {
      if (this.isUserRejectedRequestError(error)) {
        const rejectionMessage = error?.message || 'User rejected wallet connection';
        const rejectionError = createWalletError(
          ERROR_CODES.PERMISSION_DENIED,
          rejectionMessage,
        );
        this.emit('error', rejectionError);
        throw rejectionError;
      }

      const walletError = error instanceof Error
        ? createWalletError(ERROR_CODES.WALLET_CONNECTION_FAILED, error.message)
        : createWalletError(ERROR_CODES.WALLET_CONNECTION_FAILED, 'Unknown error');

      this.emit('error', walletError);
      throw walletError;
    }
  }

  /**
   * Disconnects from the wallet
   */
  public async disconnect(): Promise<void> {
    try {
      await wagmiDisconnect(this.wagmiConfig);
    } catch {
      // Ignore disconnect errors and fall back to local cleanup
    } finally {
      this.handleDisconnect();
    }
  }

  /**
   * Switches to a specific network
   */
  public async switchNetwork(chainId: SupportedChainId): Promise<void> {
    try {
      await wagmiSwitchChain(this.wagmiConfig, { chainId });
    } catch (error: any) {
      throw createWalletError(
        ERROR_CODES.UNSUPPORTED_NETWORK,
        error?.message
          ? `Failed to switch to network ${chainId}: ${error.message}`
          : `Failed to switch to network ${chainId}`,
      );
    }
  }

  /**
   * Sends a transaction
   */
  public async sendTransaction(transaction: TransactionRequest): Promise<string> {
    if (!this.isConnected || !this.currentAccount) {
      throw createWalletError(
        ERROR_CODES.WALLET_NOT_CONNECTED,
        'Wallet is not connected',
      );
    }

    try {
      validateTransactionPayload(transaction);

      const txHash = await wagmiSendTransaction(this.wagmiConfig, {
        account: this.currentAccount as Address,
        chainId: this.currentChainId ?? undefined,
        to: transaction.to as Address,
        data: transaction.data as `0x${string}`,
        value: this.hexToBigInt(transaction.value),
        gas: this.hexToBigInt(transaction.gas),
      });

      if (!isTransactionHash(txHash)) {
        throw createTransactionError('Invalid transaction hash returned');
      }

      return txHash;

    } catch (error: any) {
      // Handle user rejection
      if (error.code === 4001) {
        throw createWalletError(
          ERROR_CODES.TRANSACTION_REJECTED,
          'Transaction was rejected by user',
        );
      }

      const message = error.message || 'Transaction failed';
      throw createTransactionError(message);
    }
  }

  /**
   * Signs a message
   */
  public async signMessage(message: string): Promise<string> {
    if (!this.isConnected || !this.currentAccount) {
      throw createWalletError(
        ERROR_CODES.WALLET_NOT_CONNECTED,
        'Wallet is not connected',
      );
    }

    try {
      return await wagmiSignMessage(this.wagmiConfig, {
        account: this.currentAccount as Address,
        message,
      });

    } catch (error: any) {
      if (error.code === 4001) {
        throw createWalletError(
          ERROR_CODES.TRANSACTION_REJECTED,
          'Message signing was rejected by user',
        );
      }

      throw createWalletError(
        ERROR_CODES.UNKNOWN_ERROR,
        `Failed to sign message: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Gets account balance
   */
  public async getBalance(address?: string): Promise<string> {
    const accountAddress = address || this.currentAccount;

    if (!accountAddress) {
      throw createWalletError(
        ERROR_CODES.WALLET_NOT_CONNECTED,
        'No account available',
      );
    }

    try {
      const result = await wagmiGetBalance(this.wagmiConfig, {
        address: accountAddress as Address,
        chainId: this.currentChainId ?? undefined,
      });

      return this.bigIntToHex(result.value);

    } catch (error: any) {
      throw createWalletError(
        ERROR_CODES.UNKNOWN_ERROR,
        `Failed to get balance: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Updates the provider
   */
  public updateProvider(provider: EthereumProvider): void {
    this.provider = provider;
    this.initializeWagmiClient();
  }

  /**
   * Destroys the wallet manager
   */
  public destroy(): void {
    this.teardownWagmiWatchers();
    void this.disconnect();
    this.removeAllListeners();
  }

  /*
   * ============================================================================
   * PRIVATE METHODS
   * ============================================================================
   */

  private initializeWagmiClient(): void {
    this.teardownWagmiWatchers();
    const { config, preferredConnectorId } = createWidgetWagmiClient({
      provider: this.provider,
    });
    this.wagmiConfig = config;
    this.preferredConnectorId = preferredConnectorId;
    this.setupWagmiWatchers();
    this.syncInitialAccountState();
    void this.tryReconnect();
  }

  private async tryReconnect(): Promise<void> {
    try {
      await wagmiReconnect(this.wagmiConfig);
    } catch (error) {
      console.warn('Failed to reconnect wallet session:', error);
    } finally {
      this.syncInitialAccountState();
    }
  }

  private setupWagmiWatchers(): void {
    this.unwatchAccount = watchAccount(this.wagmiConfig, {
      onChange: this.handleAccountChange,
    });
    this.unwatchChain = watchChainId(this.wagmiConfig, {
      onChange: this.handleChainIdChange,
    });
  }

  private teardownWagmiWatchers(): void {
    this.unwatchAccount?.();
    this.unwatchAccount = undefined;
    this.unwatchChain?.();
    this.unwatchChain = undefined;
  }

  private syncInitialAccountState(): void {
    const account = wagmiGetAccount(this.wagmiConfig);
    this.applyAccountState(account, null);
  }

  private handleAccountChange = (
    account: GetAccountReturnType<Config>,
    previous: GetAccountReturnType<Config>,
  ): void => {
    this.applyAccountState(account, previous);
  };

  private handleChainIdChange = (chainId?: number, previous?: number): void => {
    if (!this.isConnected || !chainId || chainId === previous) {
      return;
    }

    const normalized = this.normalizeChainId(chainId);
    if (!normalized || normalized === this.currentChainId) {
      return;
    }

    this.currentChainId = normalized;
    this.emit('chainChange', normalized);
  };

  private applyAccountState(
    account: GetAccountReturnType<Config>,
    previous: GetAccountReturnType<Config> | null,
  ): void {
    if (account.isConnected && account.address) {
      const address = account.address;
      const addresses = account.addresses ?? (address ? [address] : []);
      const chainId = this.normalizeChainId(account.chainId);

      const previousAddresses = previous?.addresses ?? [];
      const addressesChanged =
        addresses.length !== previousAddresses.length ||
        addresses.some((addr, index) =>
          (previousAddresses[index] ?? '').toLowerCase() !== addr.toLowerCase(),
        );

      const addressChanged =
        this.currentAccount?.toLowerCase() !== address.toLowerCase();

      this.currentAccount = address;
      this.isConnected = true;

      if (chainId && this.currentChainId !== chainId) {
        this.currentChainId = chainId;
        this.emit('chainChange', chainId);
      }

      if (!previous || !previous.isConnected || addressChanged) {
        this.emit('connect', address);
      } else if (addressesChanged && addresses.length > 0) {
        this.emit('accountsChange', [...addresses]);
      }

    } else if (previous?.isConnected || this.isConnected) {
      this.handleDisconnect();
    }
  }

  private handleDisconnect(): void {
    if (!this.isConnected && !this.currentAccount) {
      return;
    }

    this.currentAccount = null;
    this.currentChainId = null;
    this.isConnected = false;
    this.emit('disconnect');
  }

  private selectConnector(): Connector | null {
    const connectors = wagmiGetConnectors(this.wagmiConfig);
    if (!connectors || connectors.length === 0) {
      return null;
    }

    if (this.preferredConnectorId) {
      const preferred = connectors.find(
        (connector) => connector.id === this.preferredConnectorId,
      );
      if (preferred) {
        return preferred;
      }
    }

    return connectors[0] ?? null;
  }

  private normalizeChainId(chainId?: number | null): SupportedChainId | null {
    if (!chainId) return null;
    return Object.prototype.hasOwnProperty.call(SUPPORTED_CHAINS, chainId)
      ? (chainId as SupportedChainId)
      : null;
  }

  private hexToBigInt(value?: string): bigint | undefined {
    if (!value) return undefined;
    try {
      const normalized = value === '0x' ? '0x0' : value;
      return BigInt(normalized);
    } catch {
      return undefined;
    }
  }

  private bigIntToHex(value: bigint): string {
    return `0x${value.toString(16)}`;
  }

  private isUserRejectedRequestError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const rpcError = error as { code?: number | string; name?: string };
    return (
      rpcError.code === 4001 ||
      rpcError.code === 'ACTION_REJECTED' ||
      rpcError.name === 'UserRejectedRequestError'
    );
  }

}

/*
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Creates a wallet manager instance
 */
export function createWalletManager(provider: EthereumProvider): WalletManager {
  return new WalletManager(provider);
}

/**
 * Checks if a provider supports the required methods
 */
export function isValidProvider(provider: unknown): provider is EthereumProvider {
  if (!provider || typeof provider !== 'object') return false;

  const p = provider as any;
  return (
    typeof p.request === 'function' &&
    typeof p.on === 'function'
  );
}

/**
 * Detects available wallets
 */
export function detectWallets(): Array<{ name: string; provider: EthereumProvider }> {
  if (typeof window === 'undefined') return [];

  const wallets: Array<{ name: string; provider: EthereumProvider }> = [];

  // MetaMask
  if (window.ethereum?.isMetaMask) {
    wallets.push({
      name: 'MetaMask',
      provider: window.ethereum,
    });
  }

  // WalletConnect
  if (window.ethereum?.isWalletConnect) {
    wallets.push({
      name: 'WalletConnect',
      provider: window.ethereum,
    });
  }

  // Generic ethereum provider
  if (window.ethereum && !window.ethereum.isMetaMask && !window.ethereum.isWalletConnect) {
    wallets.push({
      name: 'Injected Wallet',
      provider: window.ethereum,
    });
  }

  return wallets;
}

// Extend global Window interface
declare global {
  interface Window {
    ethereum?: EthereumProvider & {
      isMetaMask?: boolean;
      isWalletConnect?: boolean;
    };
  }
}
