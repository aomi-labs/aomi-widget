// AomiChatWidget - Main widget factory and management class

import { EventEmitter } from 'eventemitter3';
import {
  ConnectionStatus,
  type AomiChatWidgetParams,
  type AomiChatWidgetHandler,
  type WidgetConfig,
  type ChatState,
  type AomiChatEventListeners,
  type EthereumProvider,
  type ChatMessage,
  type WalletTransaction,
  type SupportedChainId,
} from '../types';
import {
  createConfigurationError,
  createConnectionError,
  AomiChatError as AomiError,
} from '../types/errors';
import {
  ERROR_CODES,
  DEFAULT_WIDGET_WIDTH,
  DEFAULT_WIDGET_HEIGHT,
  DEFAULT_CHAIN_ID,
  CSS_CLASSES,
  WIDGET_EVENTS,
} from '../types/constants';
import {
  validateWidgetParams,
  generateSessionId,
  createElement,
  isBrowser,
} from '../utils';
import { ChatManager } from './ChatManager';
import { ThemeManager } from './ThemeManager';
import { WalletManager } from './WalletManager';

/*
 * ============================================================================
 * WIDGET HANDLER IMPLEMENTATION
 * ============================================================================
 */

class AomiChatWidgetHandlerImpl implements AomiChatWidgetHandler {
  private container: HTMLElement;
  private config: WidgetConfig;
  private chatManager: ChatManager;
  private themeManager: ThemeManager;
  private walletManager: WalletManager | null = null;
  private widgetElement: HTMLElement | null = null;
  private isDestroyed = false;
  private eventEmitter: EventEmitter;
  private hasPromptedNetworkSwitch = false;

  constructor(container: HTMLElement, config: WidgetConfig) {
    this.eventEmitter = new EventEmitter();

    this.container = container;
    this.config = config;

    // Initialize managers
    this.chatManager = new ChatManager({
      backendUrl: config.params.baseUrl || 'http://localhost:8080',
      sessionId: config.params.sessionId || generateSessionId(),
      maxMessageLength: 2000,
      reconnectAttempts: 5,
      reconnectDelay: 3000,
    });

    this.themeManager = new ThemeManager(config.params.theme);

    // Initialize wallet manager if provider is available
    if (config.provider) {
      this.walletManager = new WalletManager(config.provider);
    }

    this.setupEventListeners();
    this.render();
    this.initialize();
  }

  /*
   * ============================================================================
   * PUBLIC API METHODS
   * ============================================================================
   */

  public async sendMessage(message: string): Promise<void> {
    if (this.isDestroyed) {
      throw new AomiError(ERROR_CODES.INITIALIZATION_FAILED, 'Widget has been destroyed');
    }

    return this.chatManager.sendMessage(message);
  }

  public updateParams(params: Partial<AomiChatWidgetParams>): void {
    if (this.isDestroyed) {
      throw new AomiError(ERROR_CODES.INITIALIZATION_FAILED, 'Widget has been destroyed');
    }

    // Validate new parameters
    const previousParams = this.config.params;
    const mergedParams = { ...previousParams, ...params };
    const errors = validateWidgetParams(mergedParams);

    if (errors.length > 0) {
      throw createConfigurationError(`Invalid parameters: ${errors.join(', ')}`);
    }

    // Update configuration
    this.config.params = mergedParams;

    if (params.chainId && params.chainId !== previousParams.chainId) {
      this.hasPromptedNetworkSwitch = false;
    }

    // Update theme if changed
    if (params.theme) {
      this.themeManager.updateTheme(params.theme);
      this.applyTheme();
    }

    // Update dimensions if changed
    if (params.width || params.height) {
      this.updateDimensions();
    }

    // Re-render if necessary
    this.render();
  }

  public updateProvider(provider?: EthereumProvider): void {
    if (this.isDestroyed) {
      throw new AomiError(ERROR_CODES.INITIALIZATION_FAILED, 'Widget has been destroyed');
    }

    this.config.provider = provider;
    this.hasPromptedNetworkSwitch = false;

    if (provider) {
      if (this.walletManager) {
        this.walletManager.updateProvider(provider);
      } else {
        this.walletManager = new WalletManager(provider);
        this.setupWalletEventListeners();
      }
    } else {
      if (this.walletManager) {
        this.walletManager.destroy();
        this.walletManager = null;
      }
    }
  }

  public getState(): ChatState {
    return this.chatManager.getState();
  }

  public getSessionId(): string {
    return this.chatManager.getSessionId();
  }

  public isReady(): boolean {
    const state = this.getState();
    return state.connectionStatus === ConnectionStatus.CONNECTED;
  }

  public on<K extends keyof AomiChatEventListeners>(
    event: K,
    listener: NonNullable<AomiChatEventListeners[K]>,
  ): AomiChatWidgetHandler {
    this.eventEmitter.on(event as string, listener as any);
    return this;
  }

  public off<K extends keyof AomiChatEventListeners>(
    event: K,
    listener: NonNullable<AomiChatEventListeners[K]>,
  ): AomiChatWidgetHandler {
    this.eventEmitter.off(event as string, listener as any);
    return this;
  }

  public clearChat(): void {
    if (this.isDestroyed) return;
    this.chatManager.clearMessages();
  }

  public exportChat(): ChatMessage[] {
    return this.getState().messages;
  }

  public resize(width?: string, height?: string): void {
    if (this.isDestroyed) return;

    if (width) this.config.params.width = width;
    if (height) this.config.params.height = height;

    this.updateDimensions();
    this.eventEmitter.emit(WIDGET_EVENTS.RESIZE, {
      width: parseInt(width || this.config.params.width || '0'),
      height: parseInt(height || this.config.params.height || '0'),
    });
  }

  public focus(): void {
    if (this.isDestroyed || !this.widgetElement) return;

    const input = this.widgetElement.querySelector('input, textarea') as HTMLElement;
    if (input) {
      input.focus();
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Clean up managers
    this.chatManager.destroy();
    this.themeManager.destroy();

    if (this.walletManager) {
      this.walletManager.destroy();
    }

    // Remove widget from DOM
    if (this.widgetElement && this.widgetElement.parentNode) {
      this.widgetElement.parentNode.removeChild(this.widgetElement);
    }

    // Clear container
    this.container.innerHTML = '';

    // Remove all event listeners
    this.eventEmitter.removeAllListeners();

    this.eventEmitter.emit(WIDGET_EVENTS.DESTROY);
  }

  /*
   * ============================================================================
   * PRIVATE METHODS
   * ============================================================================
   */

  private async initialize(): Promise<void> {
    try {
      // Connect to backend
      await this.chatManager.connectSSE();

      // Send welcome message if configured
      if (this.config.params.welcomeMessage) {
        await this.chatManager.sendSystemMessage(this.config.params.welcomeMessage);
      }

      this.eventEmitter.emit(WIDGET_EVENTS.READY);
    } catch (error) {
      const chatError = error instanceof AomiError
        ? error
        : createConnectionError('Failed to initialize widget');

      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, chatError);
    }
  }

  private setupEventListeners(): void {
    // Chat manager events
    this.chatManager.on('stateChange', (state) => {
      // Forward state changes to widget listeners
      this.forwardStateEvents(state);
    });

    this.chatManager.on('message', (message) => {
      this.eventEmitter.emit(WIDGET_EVENTS.MESSAGE, message);
    });

    this.chatManager.on('error', (error) => {
      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, error);
    });

    this.chatManager.on('connectionChange', (status) => {
      this.eventEmitter.emit(WIDGET_EVENTS.CONNECTION_CHANGE, status);
    });

    this.chatManager.on('transactionRequest', (transaction) => {
      this.eventEmitter.emit(WIDGET_EVENTS.TRANSACTION_REQUEST, transaction);
      this.handleTransactionRequest(transaction);
    });

    // Set up wallet event listeners if wallet manager exists
    if (this.walletManager) {
      this.setupWalletEventListeners();
    }
  }

  private setupWalletEventListeners(): void {
    if (!this.walletManager) return;

    this.walletManager.on('connect', (address) => {
      const chainId = this.walletManager?.getCurrentChainId() ?? null;
      const networkName = this.getNetworkName(chainId);

      this.chatManager.updateWalletState({
        isConnected: true,
        address,
        chainId: chainId ?? undefined,
        networkName,
      });
      this.eventEmitter.emit(WIDGET_EVENTS.WALLET_CONNECT, address);

      const chainLabel = chainId ?? 'unknown';
      const connectMessage =
        `User connected wallet with address ${address} on ${networkName} network ` +
        `(Chain ID: ${chainLabel}). Ready to help with transactions.`;
      void this.safeSendSystemMessage(connectMessage);
      void this.maybePromptNetworkSwitch();
    });

    this.walletManager.on('disconnect', () => {
      this.chatManager.updateWalletState({
        isConnected: false,
        address: undefined,
        chainId: undefined,
        networkName: undefined,
      });
      this.hasPromptedNetworkSwitch = false;
      this.eventEmitter.emit(WIDGET_EVENTS.WALLET_DISCONNECT);
      void this.safeSendSystemMessage('Wallet disconnected. Confirm to switch to testnet');
    });

    this.walletManager.on('chainChange', (chainId) => {
      const networkName = this.getNetworkName(chainId);
      this.chatManager.updateWalletState({ chainId, networkName });
      this.hasPromptedNetworkSwitch = false;
      this.eventEmitter.emit(WIDGET_EVENTS.NETWORK_CHANGE, chainId);
      void this.safeSendSystemMessage(
        `User switched wallet to ${networkName} network (Chain ID: ${chainId}).`,
      );
      void this.maybePromptNetworkSwitch();
    });

    this.walletManager.on('error', (error) => {
      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, error);
    });
  }

  private forwardStateEvents(state: ChatState): void {
    // Forward typing and processing changes
    this.eventEmitter.emit(WIDGET_EVENTS.TYPING_CHANGE, state.isTyping);
    this.eventEmitter.emit(WIDGET_EVENTS.PROCESSING_CHANGE, state.isProcessing);
  }

  private async handleTransactionRequest(transaction: WalletTransaction): Promise<void> {
    if (!this.walletManager) {
      await this.chatManager.sendTransactionResult(
        false,
        undefined,
        'No wallet connected',
      );
      return;
    }

    try {
      const txHash = await this.walletManager.sendTransaction({
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        gas: transaction.gas,
      });

      await this.chatManager.sendTransactionResult(true, txHash);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction failed';
      await this.chatManager.sendTransactionResult(false, undefined, message);
    }
  }

  private async safeSendSystemMessage(message: string): Promise<void> {
    try {
      await this.chatManager.sendSystemMessage(message);
    } catch (error) {
      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, error);
    }
  }

  private async maybePromptNetworkSwitch(): Promise<void> {
    if (!this.walletManager) return;

    const chainId = this.walletManager.getCurrentChainId();
    if (!chainId) return;

    if (this.hasPromptedNetworkSwitch) return;

    const walletNetwork = this.getNetworkName(chainId);
    const backendNetwork = this.getNetworkName(this.config.params.chainId ?? DEFAULT_CHAIN_ID);

    if (walletNetwork === backendNetwork) return;

    this.hasPromptedNetworkSwitch = true;

    const promptMessage =
      `New wallet connection: ${walletNetwork}, System configuration: ${backendNetwork}. ` +
      'Prompt user to confirm network switch';
    await this.safeSendSystemMessage(promptMessage);
  }

  private getNetworkName(chainId?: SupportedChainId | null): string {
    switch (chainId) {
      case 1:
        return 'mainnet';
      case 5:
      case 11155111:
      case 1337:
      case 31337:
        return 'testnet';
      case 10:
        return 'optimism';
      case 100:
        return 'gnosis';
      case 137:
        return 'polygon';
      case 42161:
        return 'arbitrum';
      case 8453:
        return 'base';
      case 59140:
        return 'linea-sepolia';
      case 59144:
        return 'linea';
      default:
        return 'testnet';
    }
  }

  private render(): void {
    // Clear existing content
    this.container.innerHTML = '';

    // Create widget element
    this.widgetElement = createElement('div', {
      className: [
        CSS_CLASSES.WIDGET_ROOT,
        CSS_CLASSES.WIDGET_CONTAINER,
        this.themeManager.getThemeClass(),
        this.getModeClass(),
      ],
      styles: {
        width: this.config.params.width || DEFAULT_WIDGET_WIDTH,
        height: this.config.params.height || DEFAULT_WIDGET_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: this.themeManager.getFontFamily(),
      },
    });

    // Apply theme
    this.applyTheme();

    // Render chat interface
    this.renderChatInterface();

    // Add to container
    this.container.appendChild(this.widgetElement);
  }

  private renderChatInterface(): void {
    if (!this.widgetElement) return;

    /*
     * This would render the actual chat UI
     * For now, create a placeholder
     */
    const chatInterface = createElement('div', {
      className: CSS_CLASSES.CHAT_INTERFACE,
      styles: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: this.themeManager.getColor('background'),
        color: this.themeManager.getColor('text'),
        border: `1px solid ${this.themeManager.getColor('border')}`,
        borderRadius: '8px',
      },
      children: [
        createElement('div', {
          styles: {
            padding: '16px',
            textAlign: 'center',
            fontSize: '14px',
            color: this.themeManager.getColor('textSecondary'),
          },
          children: ['Chat interface will be implemented here'],
        }),
      ],
    });

    this.widgetElement.appendChild(chatInterface);
  }

  private applyTheme(): void {
    if (!this.widgetElement) return;

    const theme = this.themeManager.getComputedTheme();

    // Apply CSS custom properties for theme colors
    Object.entries(theme.palette).forEach(([key, value]) => {
      this.widgetElement!.style.setProperty(`--aomi-${key}`, value);
    });

    // Apply theme class
    this.widgetElement.className = [
      CSS_CLASSES.WIDGET_ROOT,
      CSS_CLASSES.WIDGET_CONTAINER,
      this.themeManager.getThemeClass(),
      this.getModeClass(),
    ].join(' ');
  }

  private getModeClass(): string {
    switch (this.config.params.mode) {
      case 'minimal':
        return CSS_CLASSES.MODE_MINIMAL;
      case 'compact':
        return CSS_CLASSES.MODE_COMPACT;
      case 'terminal':
        return CSS_CLASSES.MODE_TERMINAL;
      default:
        return CSS_CLASSES.MODE_FULL;
    }
  }

  private updateDimensions(): void {
    if (!this.widgetElement) return;

    this.widgetElement.style.width = this.config.params.width || DEFAULT_WIDGET_WIDTH;
    this.widgetElement.style.height = this.config.params.height || DEFAULT_WIDGET_HEIGHT;
  }
}

/*
 * ============================================================================
 * WIDGET FACTORY FUNCTION
 * ============================================================================
 */

/**
 * Creates and initializes an Aomi Chat Widget
 */
export function createAomiChatWidget(
  container: HTMLElement,
  config: WidgetConfig,
): AomiChatWidgetHandler {
  // Validate environment
  if (!isBrowser()) {
    throw createConfigurationError('Widget can only be created in a browser environment');
  }

  // Validate container
  if (!container || !(container instanceof HTMLElement)) {
    throw createConfigurationError('Container must be a valid HTML element');
  }

  // Validate configuration
  const errors = validateWidgetParams(config.params);
  if (errors.length > 0) {
    throw createConfigurationError(`Configuration errors: ${errors.join(', ')}`);
  }

  // Create and return widget handler
  return new AomiChatWidgetHandlerImpl(container, config);
}

// Export the handler class for testing
export { AomiChatWidgetHandlerImpl as AomiChatWidgetHandler };
