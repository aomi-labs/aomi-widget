// AomiChatWidget - Main widget factory and management class

import { EventEmitter } from 'eventemitter3';
import {
  ConnectionStatus,
  ReadinessPhase,
  type AomiChatWidgetParams,
  type AomiChatWidgetHandler,
  type WidgetConfig,
  type ChatState,
  type AomiChatEventListeners,
  type EthereumProvider,
  type ChatMessage,
  type WalletTransaction,
  type SupportedChainId,
  type BackendReadiness,
  type WalletState,
} from '../types';
import {
  createConfigurationError,
  createConnectionError,
  createChatError,
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
  formatTimestamp,
  truncateAddress,
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
  private messageListElement: HTMLDivElement | null = null;
  private typingIndicatorElement: HTMLDivElement | null = null;
  private processingIndicatorElement: HTMLDivElement | null = null;
  private composerInputElement: HTMLTextAreaElement | null = null;
  private sendButtonElement: HTMLButtonElement | null = null;
  private connectionStatusElement: HTMLSpanElement | null = null;
  private statusTextElement: HTMLDivElement | null = null;
  private walletInfoElement: HTMLDivElement | null = null;
  private isComposerBusy = false;
  private currentConnectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private statusTextSource: 'readiness' | 'custom' = 'readiness';
  private statusResetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement, config: WidgetConfig) {
    this.eventEmitter = new EventEmitter();

    this.container = container;
    this.config = config;
    this.registerConfiguredListeners(config.listeners);

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

    if (this.statusResetTimer) {
      clearTimeout(this.statusResetTimer);
      this.statusResetTimer = null;
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
      this.updateChatInterface(state);
    });

    this.chatManager.on('message', (message) => {
      this.eventEmitter.emit(WIDGET_EVENTS.MESSAGE, message);
    });

    this.chatManager.on('error', (error) => {
      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, error);
      this.updateStatusText(`Error: ${error.message}`);
    });

    this.chatManager.on('connectionChange', (status) => {
      this.eventEmitter.emit(WIDGET_EVENTS.CONNECTION_CHANGE, status);
      this.updateConnectionStatus(status);
      this.refreshComposerState();
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

  private registerConfiguredListeners(listeners?: AomiChatEventListeners): void {
    if (!listeners) return;

    const listenerMap: Array<[keyof AomiChatEventListeners, string]> = [
      ['onReady', WIDGET_EVENTS.READY],
      ['onMessage', WIDGET_EVENTS.MESSAGE],
      ['onTransactionRequest', WIDGET_EVENTS.TRANSACTION_REQUEST],
      ['onError', WIDGET_EVENTS.ERROR],
      ['onSessionStart', WIDGET_EVENTS.SESSION_START],
      ['onSessionEnd', WIDGET_EVENTS.SESSION_END],
      ['onNetworkChange', WIDGET_EVENTS.NETWORK_CHANGE],
      ['onWalletConnect', WIDGET_EVENTS.WALLET_CONNECT],
      ['onWalletDisconnect', WIDGET_EVENTS.WALLET_DISCONNECT],
      ['onTypingChange', WIDGET_EVENTS.TYPING_CHANGE],
      ['onProcessingChange', WIDGET_EVENTS.PROCESSING_CHANGE],
      ['onConnectionChange', WIDGET_EVENTS.CONNECTION_CHANGE],
      ['onResize', WIDGET_EVENTS.RESIZE],
    ];

    for (const [listenerKey, eventName] of listenerMap) {
      const handler = listeners[listenerKey];
      if (handler) {
        this.eventEmitter.on(eventName, handler as (...args: unknown[]) => void);
      }
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

  private updateChatInterface(state: ChatState): void {
    this.renderMessages(state.messages);
    this.updateTypingIndicator(state.isTyping);
    this.updateProcessingIndicator(state.isProcessing);
    this.updateConnectionStatus(state.connectionStatus);
    this.updateStatusFromReadiness(state.readiness);
    this.updateWalletInfo(state.walletState);
    this.refreshComposerState();
  }

  private renderMessages(messages: ChatMessage[]): void {
    if (!this.messageListElement) return;

    this.messageListElement.innerHTML = '';
    const fragment = document.createDocumentFragment();

    if (messages.length === 0) {
      this.messageListElement.style.justifyContent = 'center';
      const palette = this.themeManager.getComputedTheme().palette;
      const placeholder = createElement('div', {
        styles: {
          textAlign: 'center',
          padding: this.themeManager.getSpacing('md'),
          color: palette.textSecondary,
          fontSize: '13px',
        },
        children: ['Your conversation will appear here.'],
      });
      this.messageListElement.appendChild(placeholder);
      return;
    }

    this.messageListElement.style.justifyContent = 'flex-start';

    messages.forEach((message) => {
      fragment.appendChild(this.createMessageElement(message));
    });

    this.messageListElement.appendChild(fragment);
    this.scrollMessagesToBottom();
  }

  private createMessageElement(message: ChatMessage): HTMLElement {
    const theme = this.themeManager.getComputedTheme();
    const palette = theme.palette;
    const spacingSm = this.themeManager.getSpacing('sm');
    const bubbleRadius = this.themeManager.getBorderRadius('lg');
    const wrapper = createElement('div', {
      styles: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
        gap: '4px',
      },
    });

    const bubbleStyles: Partial<CSSStyleDeclaration> = {
      maxWidth: '90%',
      padding: spacingSm,
      borderRadius: bubbleRadius,
      fontSize: '14px',
      lineHeight: '1.4',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    };

    let metaColor = palette.textSecondary;
    let textColor = palette.text;

    switch (message.type) {
      case 'user':
        bubbleStyles.backgroundColor = this.themeManager.getColor('primary');
        textColor = '#ffffff';
        break;
      case 'assistant':
        bubbleStyles.backgroundColor = palette.background;
        bubbleStyles.border = `1px solid ${palette.border}`;
        break;
      case 'system':
      default:
        bubbleStyles.backgroundColor = palette.surface;
        bubbleStyles.border = `1px dashed ${palette.border}`;
        bubbleStyles.fontStyle = 'italic';
        break;
    }

    const bubble = createElement('div', {
      styles: {
        ...bubbleStyles,
        color: textColor,
      },
    });
    bubble.textContent = message.content;

    if (message.toolStream) {
      const toolDetails = createElement('div', {
        styles: {
          marginTop: spacingSm,
          padding: spacingSm,
          fontSize: '12px',
          fontFamily: this.themeManager.getMonospaceFontFamily(),
          whiteSpace: 'pre-wrap',
          borderRadius: this.themeManager.getBorderRadius('sm'),
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
          color: palette.textSecondary,
        },
        children: [
          JSON.stringify(message.toolStream, null, 2),
        ],
      });
      bubble.appendChild(toolDetails);
    }

    const meta = createElement('div', {
      styles: {
        fontSize: '11px',
        color: metaColor,
        alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
      },
    });

    const senderLabel = message.type === 'user'
      ? 'You'
      : message.type === 'assistant'
        ? 'Assistant'
        : 'System';
    const timestampLabel = formatTimestamp(message.timestamp);
    meta.textContent = `${senderLabel} • ${timestampLabel}`;

    wrapper.append(bubble, meta);
    return wrapper;
  }

  private scrollMessagesToBottom(): void {
    if (!this.messageListElement) return;
    this.messageListElement.scrollTo({
      top: this.messageListElement.scrollHeight,
      behavior: 'smooth',
    });
  }

  private updateTypingIndicator(isTyping: boolean): void {
    if (!this.typingIndicatorElement) return;
    this.typingIndicatorElement.style.display = isTyping ? 'block' : 'none';
  }

  private updateProcessingIndicator(isProcessing: boolean): void {
    if (!this.processingIndicatorElement) return;
    this.processingIndicatorElement.style.display = isProcessing ? 'block' : 'none';
  }

  private updateConnectionStatus(status: ConnectionStatus): void {
    this.currentConnectionStatus = status;

    if (!this.connectionStatusElement) return;

    const palette = this.themeManager.getComputedTheme().palette;

    const statusLabels: Record<ConnectionStatus, string> = {
      [ConnectionStatus.CONNECTED]: 'connected',
      [ConnectionStatus.CONNECTING]: 'connecting',
      [ConnectionStatus.DISCONNECTED]: 'disconnected',
      [ConnectionStatus.ERROR]: 'error',
      [ConnectionStatus.RECONNECTING]: 'reconnecting',
    };

    const backgroundMap: Record<ConnectionStatus, string> = {
      [ConnectionStatus.CONNECTED]: this.themeManager.getColor('success'),
      [ConnectionStatus.CONNECTING]: palette.accent,
      [ConnectionStatus.DISCONNECTED]: palette.border,
      [ConnectionStatus.ERROR]: this.themeManager.getColor('error'),
      [ConnectionStatus.RECONNECTING]: this.themeManager.getColor('warning'),
    };

    const textColor = (
      status === ConnectionStatus.DISCONNECTED
        ? palette.textSecondary
        : '#ffffff'
    );

    this.connectionStatusElement.textContent = statusLabels[status];
    this.connectionStatusElement.style.backgroundColor = backgroundMap[status];
    this.connectionStatusElement.style.color = textColor;
  }

  private updateStatusText(text: string, source: 'custom' | 'readiness' = 'custom'): void {
    if (!this.statusTextElement) return;

    if (source === 'readiness') {
      this.statusTextSource = 'readiness';
      if (this.statusResetTimer) {
        clearTimeout(this.statusResetTimer);
        this.statusResetTimer = null;
      }
      this.statusTextElement.textContent = text;
      return;
    }

    this.statusTextSource = 'custom';
    this.statusTextElement.textContent = text;

    if (this.statusResetTimer) {
      clearTimeout(this.statusResetTimer);
    }

    this.statusResetTimer = setTimeout(() => {
      this.statusTextSource = 'readiness';
      this.statusResetTimer = null;
      this.updateStatusFromReadiness(this.chatManager.getState().readiness);
    }, 5000);
  }

  private updateStatusFromReadiness(readiness: BackendReadiness): void {
    if (!readiness || this.statusTextSource !== 'readiness') return;

    let message: string;

    switch (readiness.phase) {
      case ReadinessPhase.INITIALIZING:
        message = 'Booting assistant…';
        break;
      case ReadinessPhase.CONNECTING_MCP:
        message = 'Connecting to Aomi services…';
        break;
      case ReadinessPhase.VALIDATING_ANTHROPIC:
        message = 'Authorising AI backend…';
        break;
      case ReadinessPhase.READY:
        message = 'Assistant ready to help.';
        break;
      case ReadinessPhase.MISSING_API_KEY:
        message = 'Backend missing API credentials.';
        break;
      case ReadinessPhase.ERROR:
      default:
        message = 'Assistant experienced an error.';
        break;
    }

    if (readiness.detail) {
      message = `${message} (${String(readiness.detail)})`;
    }

    this.updateStatusText(message, 'readiness');
  }

  private updateWalletInfo(walletState: WalletState): void {
    if (!this.walletInfoElement) return;

    if (walletState.isConnected && walletState.address) {
      const addressLabel = truncateAddress(walletState.address);
      const networkLabel = walletState.networkName ?? 'unknown network';
      this.walletInfoElement.textContent = `Wallet ${addressLabel} · ${networkLabel}`;
    } else {
      this.walletInfoElement.textContent = 'Wallet disconnected';
    }
  }

  private refreshComposerState(): void {
    if (!this.composerInputElement || !this.sendButtonElement) return;

    const isConnected = this.currentConnectionStatus === ConnectionStatus.CONNECTED;
    const hasContent = this.composerInputElement.value.trim().length > 0;
    const disableInput = this.isComposerBusy || !isConnected;
    const wasDisabled = this.composerInputElement.disabled;

    this.composerInputElement.disabled = disableInput;
    this.sendButtonElement.disabled = disableInput || !hasContent;
    this.sendButtonElement.style.opacity = this.sendButtonElement.disabled ? '0.5' : '1';

    if (!disableInput && wasDisabled) {
      this.composerInputElement.focus();
    }
  }

  private setComposerBusy(isBusy: boolean): void {
    this.isComposerBusy = isBusy;
    this.refreshComposerState();
  }

  private async handleComposerSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.isDestroyed) return;
    if (!this.composerInputElement) return;

    const rawValue = this.composerInputElement.value;
    const trimmed = rawValue.trim();

    if (!trimmed) {
      this.refreshComposerState();
      return;
    }

    this.setComposerBusy(true);

    try {
      await this.chatManager.sendMessage(trimmed);
      this.composerInputElement.value = '';
      this.updateStatusText('Message sent.');
    } catch (error) {
      const chatError = error instanceof AomiError
        ? error
        : createChatError(ERROR_CODES.UNKNOWN_ERROR, error instanceof Error ? error.message : 'Failed to send message');

      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, chatError);
      this.updateStatusText(`Send failed: ${chatError.message}`);
    } finally {
      this.setComposerBusy(false);
    }
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

    this.updateChatInterface(this.chatManager.getState());

    // Add to container
    this.container.appendChild(this.widgetElement);
  }

  private renderChatInterface(): void {
    if (!this.widgetElement) return;

    this.widgetElement.innerHTML = '';

    const theme = this.themeManager.getComputedTheme();
    const palette = theme.palette;
    const spacingSm = this.themeManager.getSpacing('sm');
    const spacingLg = this.themeManager.getSpacing('lg');
    const borderRadius = this.themeManager.getBorderRadius('md');
    const primaryColor = this.themeManager.getColor('primary');

    const chatInterface = createElement('div', {
      className: CSS_CLASSES.CHAT_INTERFACE,
      styles: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: palette.surface,
        borderRadius,
        border: `1px solid ${palette.border}`,
        overflow: 'hidden',
      },
    });

    const header = createElement('header', {
      styles: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacingLg,
        backgroundColor: palette.background,
        borderBottom: `1px solid ${palette.border}`,
      },
    });

    const title = createElement('div', {
      styles: {
        fontSize: '16px',
        fontWeight: '600',
        color: palette.text,
      },
      children: [this.config.params.content?.welcomeTitle ?? 'Aomi Assistant'],
    });

    const statusPill = createElement('span', {
      styles: {
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'capitalize',
        backgroundColor: palette.border,
        color: palette.textSecondary,
        transition: 'background-color 0.2s ease, color 0.2s ease',
      },
      children: ['connecting'],
    }) as HTMLSpanElement;
    this.connectionStatusElement = statusPill;

    header.append(title, statusPill);

    const metaBar = createElement('div', {
      styles: {
        display: 'flex',
        flexDirection: 'column',
        gap: spacingSm,
        padding: `${spacingSm} ${spacingLg}`,
        backgroundColor: palette.background,
        borderBottom: `1px solid ${palette.border}`,
      },
    });

    const statusText = createElement('div', {
      styles: {
        fontSize: '13px',
        color: palette.textSecondary,
        minHeight: '18px',
      },
      children: ['Preparing assistant…'],
    }) as HTMLDivElement;
    this.statusTextElement = statusText;

    const walletInfo = createElement('div', {
      styles: {
        fontSize: '12px',
        color: palette.textSecondary,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      },
      children: ['Wallet disconnected'],
    }) as HTMLDivElement;
    this.walletInfoElement = walletInfo;

    metaBar.append(statusText, walletInfo);

    const body = createElement('div', {
      styles: {
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: spacingSm,
        padding: spacingLg,
        overflow: 'hidden',
      },
    });

    const messageList = createElement('div', {
      styles: {
        flex: '1 1 auto',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: spacingSm,
        paddingRight: '6px',
      },
    }) as HTMLDivElement;
    this.messageListElement = messageList;

    const typingIndicator = createElement('div', {
      styles: {
        display: 'none',
        color: palette.textSecondary,
        fontSize: '12px',
      },
      children: ['Assistant is typing…'],
    }) as HTMLDivElement;
    this.typingIndicatorElement = typingIndicator;

    const processingIndicator = createElement('div', {
      styles: {
        display: 'none',
        color: palette.textSecondary,
        fontSize: '12px',
      },
      children: ['Processing request…'],
    }) as HTMLDivElement;
    this.processingIndicatorElement = processingIndicator;

    body.append(messageList, typingIndicator, processingIndicator);

    const composerForm = createElement('form', {
      styles: {
        marginTop: spacingSm,
        padding: spacingLg,
        borderTop: `1px solid ${palette.border}`,
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        gap: spacingSm,
      },
    }) as HTMLFormElement;

    const composerInput = createElement('textarea', {
      styles: {
        width: '100%',
        minHeight: '64px',
        resize: 'vertical',
        padding: spacingSm,
        borderRadius,
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.surface,
        color: palette.text,
        fontFamily: theme.fonts?.primary ?? 'inherit',
        fontSize: '14px',
        lineHeight: '1.4',
      },
      attributes: {
        placeholder: this.config.params.placeholder ?? 'Ask anything about your wallet or transactions…',
      },
    }) as HTMLTextAreaElement;
    this.composerInputElement = composerInput;

    const controlsRow = createElement('div', {
      styles: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: spacingSm,
      },
    });

    const sendButton = createElement('button', {
      styles: {
        padding: '8px 16px',
        borderRadius,
        border: 'none',
        backgroundColor: primaryColor,
        color: '#ffffff',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'opacity 0.2s ease',
      },
      attributes: {
        type: 'submit',
      },
      children: ['Send'],
    }) as HTMLButtonElement;
    this.sendButtonElement = sendButton;

    composerForm.addEventListener('submit', (event) => {
      void this.handleComposerSubmit(event);
    });

    composerInput.addEventListener('input', () => {
      this.refreshComposerState();
    });

    controlsRow.append(sendButton);
    composerForm.append(composerInput, controlsRow);

    chatInterface.append(header, metaBar, body, composerForm);

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
