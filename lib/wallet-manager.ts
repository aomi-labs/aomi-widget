import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, optimism, base, polygon } from '@reown/appkit/networks'

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [mainnet, arbitrum, optimism, base, polygon]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig

// ==================================================================


export interface WalletManagerConfig {
  sendSystemMessage: (message: string) => Promise<void>;
  logMessage?: (message: string) => void;
}

export interface WalletManagerEventHandlers {
  onConnectionChange: (isConnected: boolean, address?: string) => void;
  onChainChange: (chainId: number, networkName: string) => void;
  onError: (error: Error) => void;
}

export interface WalletState {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  networkName: string;
}

export class WalletManager {
  private config: WalletManagerConfig;
  private onConnectionChange: (isConnected: boolean, address?: string) => void;
  private onChainChange: (chainId: number, networkName: string) => void;
  private onError: (error: Error) => void;

  private state: WalletState;

  constructor(config: WalletManagerConfig, eventHandlers: Partial<WalletManagerEventHandlers> = {}) {
    this.config = config;

    // Event handlers
    this.onConnectionChange = eventHandlers.onConnectionChange || (() => {});
    this.onChainChange = eventHandlers.onChainChange || (() => {});
    this.onError = eventHandlers.onError || (() => {});

    // Initial state
    this.state = {
      isConnected: false,
      networkName: 'testnet',
    };
  }

  // Map chain ID to network name
  private getChainIdToNetworkName(chainId: number): string {
    switch (chainId) {
      case 1: return 'ethereum';
      case 137: return 'polygon';
      case 42161: return 'arbitrum';
      case 8453: return 'base';
      case 10: return 'optimism';
      case 11155111: return 'sepolia';
      case 1337: return 'testnet';
      case 31337: return 'testnet'; // Local testnets (Anvil)
      case 59140: return 'linea-sepolia';
      case 59144: return 'linea';
      default: return 'testnet';
    }
  }

  // Send system message to backend
  private async sendSystemMessage(message: string): Promise<void> {
    try {
      await this.config.sendSystemMessage(message);
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Handle wallet connection
  async handleConnect(address: string, chainId: number): Promise<void> {
    const networkName = this.getChainIdToNetworkName(chainId);

    this.state = {
      ...this.state,
      isConnected: true,
      address,
      chainId,
      networkName,
    };

    // Notify handlers
    this.onConnectionChange(true, address);
    this.onChainChange(chainId, networkName);

    this.logMessage(`Wallet connected (${this.formatAddress(address)}) on ${networkName} (chain ${chainId}). Tool calls will use this network.`);

    // Send system message to backend
    await this.sendSystemMessage(
      `User connected wallet with address ${address} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`
    );
  }

  // Handle wallet disconnection
  async handleDisconnect(): Promise<void> {
    this.state = {
      ...this.state,
      isConnected: false,
      address: undefined,
      chainId: undefined,
    };

    // Notify handlers
    this.onConnectionChange(false);

    this.logMessage('Wallet disconnected. I will pause wallet-dependent actions until you reconnect.');
    // Send system message to backend
    await this.sendSystemMessage('Wallet disconnected by user.');
  }

  // Handle chain change
  async handleChainChange(chainId: number): Promise<void> {
    if (!this.state.isConnected) return;

    const networkName = this.getChainIdToNetworkName(chainId);

    this.state = {
      ...this.state,
      chainId,
      networkName,
    };

    // Notify handlers
    this.onChainChange(chainId, networkName);

    this.logMessage(
      `Wallet switched to ${networkName} (chain ${chainId}). Future tool calls will target this network.`
    );

    // Send system message to backend
    await this.sendSystemMessage(
      `User switched wallet to ${networkName} network (Chain ID: ${chainId}).`
    );
  }

  // Get current wallet state
  getState(): WalletState {
    return { ...this.state };
  }

  private logMessage(message: string): void {
    if (this.config.logMessage) {
      this.config.logMessage(message);
    } else {
      console.log(`[WalletManager] ${message}`);
    }
  }

  private formatAddress(address?: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
