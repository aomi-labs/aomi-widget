import { EventEmitter } from 'eventemitter3';
import type { EthereumProvider, SupportedChainId } from '../types/interface';
import { type TransactionRequest } from '../utils/helper';
interface WalletManagerEvents {
    connect: (_address: string) => void;
    disconnect: () => void;
    chainChange: (_chainId: SupportedChainId) => void;
    accountsChange: (_accounts: string[]) => void;
    error: (_error: Error) => void;
}
export declare class WalletManager extends EventEmitter<WalletManagerEvents> {
    private provider?;
    private currentAccount;
    private currentChainId;
    private isConnected;
    private wagmiConfig;
    private preferredConnectorId?;
    private unwatchAccount?;
    private unwatchChain?;
    constructor(provider: EthereumProvider);
    /**
     * Gets the current connected account
     */
    getCurrentAccount(): string | null;
    /**
     * Gets the current chain ID
     */
    getCurrentChainId(): SupportedChainId | null;
    /**
     * Gets the current network name
     */
    getCurrentNetworkName(): string | null;
    /**
     * Checks if wallet is connected
     */
    getIsConnected(): boolean;
    /**
     * Connects to the wallet
     */
    connect(): Promise<string>;
    /**
     * Disconnects from the wallet
     */
    disconnect(): Promise<void>;
    /**
     * Switches to a specific network
     */
    switchNetwork(chainId: SupportedChainId): Promise<void>;
    /**
     * Sends a transaction
     */
    sendTransaction(transaction: TransactionRequest): Promise<string>;
    /**
     * Signs a message
     */
    signMessage(message: string): Promise<string>;
    /**
     * Gets account balance
     */
    getBalance(address?: string): Promise<string>;
    /**
     * Updates the provider
     */
    updateProvider(provider: EthereumProvider): void;
    /**
     * Destroys the wallet manager
     */
    destroy(): void;
    private initializeWagmiClient;
    private tryReconnect;
    private setupWagmiWatchers;
    private teardownWagmiWatchers;
    private syncInitialAccountState;
    private handleAccountChange;
    private handleChainIdChange;
    private applyAccountState;
    private handleDisconnect;
    private selectConnector;
    private normalizeChainId;
    private hexToBigInt;
    private bigIntToHex;
    private isUserRejectedRequestError;
}
/**
 * Creates a wallet manager instance
 */
export declare function createWalletManager(provider: EthereumProvider): WalletManager;
/**
 * Checks if a provider supports the required methods
 */
export declare function isValidProvider(provider: unknown): provider is EthereumProvider;
/**
 * Detects available wallets
 */
export declare function detectWallets(): Array<{
    name: string;
    provider: EthereumProvider;
}>;
declare global {
    interface Window {
        ethereum?: EthereumProvider & {
            isMetaMask?: boolean;
            isWalletConnect?: boolean;
        };
    }
}
export {};
//# sourceMappingURL=walletManager.d.ts.map