// WalletManager - Handles wallet connection and transactions

import { EventEmitter } from 'eventemitter3';
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
  getNetworkConfig,
  validateTransactionPayload,
} from './util';

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
  private provider: EthereumProvider;
  private currentAccount: string | null = null;
  private currentChainId: SupportedChainId | null = null;
  private isConnected = false;

  constructor(provider: EthereumProvider) {
    super();
    this.provider = provider;
    this.setupEventListeners();
    this.initializeState();
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
      const accounts = await this.provider.request({
        id: Date.now(),
        method: 'eth_requestAccounts',
        params: [],
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw createWalletError(
          ERROR_CODES.WALLET_CONNECTION_FAILED,
          'No accounts returned from wallet',
        );
      }

      const account = accounts[0];
      if (!isEthereumAddress(account)) {
        throw createWalletError(
          ERROR_CODES.WALLET_CONNECTION_FAILED,
          'Invalid account address',
        );
      }

      this.currentAccount = account;
      this.isConnected = true;

      // Get chain ID
      await this.updateChainId();

      this.emit('connect', account);
      return account;

    } catch (error) {
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
  public disconnect(): void {
    this.currentAccount = null;
    this.currentChainId = null;
    this.isConnected = false;
    this.emit('disconnect');
  }

  /**
   * Switches to a specific network
   */
  public async switchNetwork(chainId: SupportedChainId): Promise<void> {
    try {
      await this.provider.request({
        id: Date.now(),
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If the chain is not added, try to add it
      if (error.code === 4902) {
        await this.addNetwork(chainId);
      } else {
        throw createWalletError(
          ERROR_CODES.UNSUPPORTED_NETWORK,
          `Failed to switch to network ${chainId}: ${error.message}`,
        );
      }
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
      // Validate transaction
      validateTransactionPayload(transaction);

      // Prepare transaction parameters
      const txParams: any = {
        from: this.currentAccount,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
      };

      if (transaction.gas) {
        txParams.gas = transaction.gas;
      }

      // Send transaction
      const txHash = await this.provider.request({
        id: Date.now(),
        method: 'eth_sendTransaction',
        params: [txParams],
      }) as string;

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
      const signature = await this.provider.request({
        id: Date.now(),
        method: 'personal_sign',
        params: [message, this.currentAccount],
      }) as string;

      return signature;

    } catch (error: any) {
      if (error.code === 4001) {
        throw createWalletError(
          ERROR_CODES.TRANSACTION_REJECTED,
          'Message signing was rejected by user',
        );
      }

      throw createWalletError(
        ERROR_CODES.UNKNOWN_ERROR,
        `Failed to sign message: ${error.message}`,
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
      const balance = await this.provider.request({
        id: Date.now(),
        method: 'eth_getBalance',
        params: [accountAddress, 'latest'],
      }) as string;

      return balance;

    } catch (error: any) {
      throw createWalletError(
        ERROR_CODES.UNKNOWN_ERROR,
        `Failed to get balance: ${error.message}`,
      );
    }
  }

  /**
   * Updates the provider
   */
  public updateProvider(provider: EthereumProvider): void {
    // Clean up old provider
    this.removeProviderListeners();

    // Set new provider
    this.provider = provider;

    // Setup new listeners
    this.setupEventListeners();

    // Re-initialize state
    this.initializeState();
  }

  /**
   * Destroys the wallet manager
   */
  public destroy(): void {
    this.removeProviderListeners();
    this.disconnect();
    this.removeAllListeners();
  }

  /*
   * ============================================================================
   * PRIVATE METHODS
   * ============================================================================
   */

  private async initializeState(): Promise<void> {
    try {
      // Check if already connected
      const accounts = await this.provider.request({
        id: Date.now(),
        method: 'eth_accounts',
        params: [],
      }) as string[];

      if (accounts && accounts.length > 0 && isEthereumAddress(accounts[0])) {
        this.currentAccount = accounts[0];
        this.isConnected = true;
        await this.updateChainId();
        this.emit('connect', accounts[0]);
      }
    } catch (error) {
      // Ignore errors during initialization
      console.warn('Failed to initialize wallet state:', error);
    }
  }

  private async updateChainId(): Promise<void> {
    try {
      const chainId = await this.provider.request({
        id: Date.now(),
        method: 'eth_chainId',
        params: [],
      }) as string;

      const numericChainId = parseInt(chainId, 16) as SupportedChainId;

      if (this.currentChainId !== numericChainId) {
        this.currentChainId = numericChainId;
        this.emit('chainChange', numericChainId);
      }
    } catch (error) {
      console.warn('Failed to get chain ID:', error);
    }
  }

  private setupEventListeners(): void {
    if (this.provider.on) {
      this.provider.on('accountsChanged', this.handleAccountsChanged.bind(this) as any);
      this.provider.on('chainChanged', this.handleChainChanged.bind(this) as any);
      this.provider.on('disconnect', this.handleDisconnect.bind(this));
    }
  }

  private removeProviderListeners(): void {
    if (this.provider.removeListener) {
      this.provider.removeListener?.('accountsChanged', this.handleAccountsChanged.bind(this) as any);
      this.provider.removeListener?.('chainChanged', this.handleChainChanged.bind(this) as any);
      this.provider.removeListener('disconnect', this.handleDisconnect.bind(this));
    }
  }

  private handleAccountsChanged(accounts: string[]): void {
    if (!accounts || accounts.length === 0) {
      this.disconnect();
    } else if (accounts[0] !== this.currentAccount) {
      this.currentAccount = accounts[0];
      this.isConnected = true;
      this.emit('accountsChange', accounts);
      this.emit('connect', accounts[0]);
    }
  }

  private handleChainChanged(chainId: string): void {
    const numericChainId = parseInt(chainId, 16) as SupportedChainId;
    this.currentChainId = numericChainId;
    this.emit('chainChange', numericChainId);
  }

  private handleDisconnect(): void {
    this.disconnect();
  }

  private async addNetwork(chainId: SupportedChainId): Promise<void> {
    const networkConfig = getNetworkConfig(chainId);

    if (!networkConfig) {
      throw createWalletError(
        ERROR_CODES.UNSUPPORTED_NETWORK,
        `Network ${chainId} is not supported`,
      );
    }

    try {
      await this.provider.request({
        id: Date.now(),
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      });
    } catch (error: any) {
      throw createWalletError(
        ERROR_CODES.UNSUPPORTED_NETWORK,
        `Failed to add network ${chainId}: ${error.message}`,
      );
    }
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
