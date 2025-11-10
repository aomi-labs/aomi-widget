// AomiWidget - Main widget factory and management class

import { EventEmitter } from 'eventemitter3';
import {
  ConnectionStatus,
  type OptionalParam,
  type AomiWidgetHandler,
  type WidgetConfig,
  type ChatState,
  type AomiEventListeners,
  type EthereumProvider,
  type ChatMessage,
  type WalletTransaction,
  type ResolvedParams,
} from '../types/interface';
import { createWidgetError } from '../types/interface';
import {
  ERROR_CODES,
  CSS_CLASSES,
  WIDGET_EVENTS,
  SUPPORTED_CHAINS,
} from '../types/constants';
import {
  validateWidgetParams,
  generateSessionId,
  createElement,
  isBrowser,
  truncateAddress,
} from '../utils/helper';
import { renderMarkdown } from '../utils/markdown';
import { resolveWidgetParams } from '../utils/widgetParams';
import { ChatManager } from './ChatManager';
import { WalletManager } from './walletManager';
import { WidgetSurface } from './widgetSurface';

type MessageBubblePayload = {
  type: ChatMessage['type'];
  content: string;
  timestamp?: Date;
  toolStream?: ChatMessage['toolStream'];
};

/*
 * ============================================================================
 * WIDGET HANDLER IMPLEMENTATION
 * ============================================================================
 */

class DefaultAomiWidget implements AomiWidgetHandler {
  private container: HTMLElement;
  private config: WidgetConfig;
  private chatManager: ChatManager;
  private walletManager: WalletManager | null = null;
  private widgetElement: HTMLElement | null = null;
  private messageListElement: HTMLElement | null = null;
  private messageInputElement: HTMLTextAreaElement | null = null;
  private sendButtonElement: HTMLButtonElement | null = null;
  private walletStatusElement: HTMLButtonElement | null = null;
  private eventEmitter: EventEmitter;
  private lastState: ChatState | null = null;
  private activeSessionId: string | null = null;
  private surface!: WidgetSurface;
  private resolvedParams!: ResolvedParams;

  constructor(container: HTMLElement, config: WidgetConfig) {
    this.eventEmitter = new EventEmitter();

    this.container = container;
    this.config = config;

    this.refreshResolvedParams();
    this.rebuildSurface();

    // Initialize managers
    this.chatManager = new ChatManager({
      backendUrl: config.params.baseUrl || 'http://localhost:8080',
      sessionId: config.params.sessionId || generateSessionId(),
      maxMessageLength: 2000,
      reconnectAttempts: 5,
      reconnectDelay: 3000,
    });

    // Initialize wallet manager if provider is available
    if (config.provider) {
      this.walletManager = new WalletManager(config.provider);
    }

    this.setupEventListeners();
    this.registerConfigListeners();
    this.render();
    this.initialize();
    this.updateStateView(this.chatManager.getState());
  }

  /*
   * ============================================================================
   * PUBLIC API METHODS
   * ============================================================================
   */

  public async sendMessage(message: string): Promise<void> {
    return this.chatManager.sendMessage(message);
  }

  public updateParams(params: Partial<OptionalParam>): void {

    // Validate new parameters
    const mergedParams = { ...this.config.params, ...params };
    const errors = validateWidgetParams(mergedParams);

    if (errors.length > 0) {
      throw createWidgetError(
        ERROR_CODES.INVALID_CONFIG,
        `Invalid parameters: ${errors.join(', ')}`,
      );
    }

    const previousSurfaceMode = this.resolvedParams.renderSurface;
    this.config.params = mergedParams;
    this.refreshResolvedParams();

    if (this.resolvedParams.renderSurface !== previousSurfaceMode) {
      this.rebuildSurface();
    }

    this.updateDimensions();
    this.render();
  }

  public updateProvider(provider?: EthereumProvider): void {

    this.config.provider = provider;

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

    this.updateWalletStatus();
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

  public on<K extends keyof AomiEventListeners>(
    event: K,
    listener: NonNullable<AomiEventListeners[K]>,
  ): AomiWidgetHandler {
    const eventName = this.getEventNameForListener(event);
    this.eventEmitter.on(eventName, listener as any);
    return this;
  }

  public off<K extends keyof AomiEventListeners>(
    event: K,
    listener: NonNullable<AomiEventListeners[K]>,
  ): AomiWidgetHandler {
    const eventName = this.getEventNameForListener(event);
    this.eventEmitter.off(eventName, listener as any);
    return this;
  }

  public clearChat(): void {
    this.chatManager.clearMessages();
  }

  public exportChat(): ChatMessage[] {
    return this.getState().messages;
  }

  public focus(): void {
    if (!this.widgetElement) return;

    const input = this.widgetElement.querySelector(
      'input, textarea',
    ) as HTMLElement;
    if (input) {
      input.focus();
    }
  }

  public destroy(): void {


    // Clean up managers
    this.chatManager.destroy();

    if (this.walletManager) {
      this.walletManager.destroy();
    }

    if (this.widgetElement && this.widgetElement.parentNode) {
      this.widgetElement.parentNode.removeChild(this.widgetElement);
    }

    this.surface.destroy();

    if (this.activeSessionId) {
      this.eventEmitter.emit(WIDGET_EVENTS.SESSION_END, this.activeSessionId);
      this.activeSessionId = null;
    }

    this.eventEmitter.emit(WIDGET_EVENTS.DESTROY);
    this.eventEmitter.removeAllListeners();
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

      this.eventEmitter.emit(WIDGET_EVENTS.READY);
    } catch (error) {
      const widgetError =
        error instanceof Error
          ? error
          : createWidgetError(ERROR_CODES.CONNECTION_FAILED, 'Failed to initialize widget');

      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, widgetError);
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
      this.pushSystemNotification(error.message);
    });

    this.chatManager.on('connectionChange', (status) => {
      this.handleConnectionStatusChange(status);
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
      this.eventEmitter.emit(WIDGET_EVENTS.WALLET_CONNECT, address);
      this.pushSystemNotification(
        `Wallet connected: ${truncateAddress(address)}`,
      );
      this.updateWalletStatus();
      this.refreshResolvedParams();
    });

    this.walletManager.on('disconnect', () => {
      this.eventEmitter.emit(WIDGET_EVENTS.WALLET_DISCONNECT);
      this.pushSystemNotification('Wallet disconnected.');
      this.updateWalletStatus();
      this.refreshResolvedParams();
    });

    this.walletManager.on('chainChange', (chainId) => {
      this.eventEmitter.emit(WIDGET_EVENTS.NETWORK_CHANGE, chainId);
      this.pushSystemNotification(
        `Switched to ${SUPPORTED_CHAINS[chainId] || `chain ${chainId}`}.`,
      );
      this.updateWalletStatus();
      this.refreshResolvedParams();
    });

    this.walletManager.on('error', (error) => {
      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, error);
      this.updateWalletStatus();
    });
  }

  private forwardStateEvents(state: ChatState): void {
    this.updateStateView(state);
  }

  private async handleTransactionRequest(
    transaction: WalletTransaction,
  ): Promise<void> {
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
      const message =
        error instanceof Error ? error.message : 'Transaction failed';
      await this.chatManager.sendTransactionResult(false, undefined, message);
    }
  }

  private render(): void {
    this.surface.setDimensions(this.resolvedParams.width, this.resolvedParams.height);
    this.surface.clear();
    this.resetDomReferences();

    // Create widget element
    const palette = this.getThemePalette();

    this.widgetElement = createElement('div', {
      className: [CSS_CLASSES.WIDGET_ROOT, CSS_CLASSES.WIDGET_CONTAINER].join(' '),
      styles: {
        width: '100%',
        height: '100%',
        maxHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: this.getFontFamily(),
        backgroundColor: palette.background,
        color: palette.text,
      },
    }, this.surface.getDocument());

    // Render chat interface
    this.renderChatInterface();

    // Add to container
    this.surface.getRoot().appendChild(this.widgetElement);
    if (this.lastState) {
      this.updateStateView(this.lastState);
    }
  }

  private renderChatInterface(): void {
    if (!this.widgetElement) return;

    const palette = this.getThemePalette();

    const chatInterface = createElement('div', {
      className: CSS_CLASSES.CHAT_INTERFACE,
      styles: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: palette.surface,
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        minHeight: '0',
      },
    }, this.surface.getDocument());

    const header = this.createHeader();
    const body = this.createBody();
    const actionBar = this.createActionBar();

    chatInterface.appendChild(header);
    chatInterface.appendChild(body);
    chatInterface.appendChild(actionBar);

    this.widgetElement.appendChild(chatInterface);
    this.bindActionBarEvents();
  }

  private createHeader(): HTMLElement {
    const palette = this.getThemePalette();

    const title = createElement('div', {
      className: CSS_CLASSES.CHAT_TITLE,
      styles: {
        fontWeight: '600',
        fontSize: '15px',
        color: palette.text,
      },
      children: [this.getWidgetTitle()],
    }, this.surface.getDocument());

    this.walletStatusElement = createElement('button', {
      className: CSS_CLASSES.WALLET_STATUS,
      attributes: { type: 'button' },
      styles: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '999px',
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        color: palette.textSecondary,
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
        transition:
          'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
      },
      children: ['Connect Wallet'],
    }, this.surface.getDocument()) as HTMLButtonElement;

    this.walletStatusElement.addEventListener('click', () => {
      void this.handleWalletButtonClick();
    });

    const header = createElement('div', {
      className: CSS_CLASSES.CHAT_HEADER,
      styles: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: palette.background,
      },
    }, this.surface.getDocument());

    header.appendChild(title);
    header.appendChild(this.walletStatusElement);

    this.updateWalletStatus();
    return header;
  }

  private createBody(): HTMLElement {
    const palette = this.getThemePalette();

    this.messageListElement = createElement('div', {
      className: CSS_CLASSES.MESSAGE_LIST,
      styles: {
        flex: '1 1 auto',
        overflowY: 'auto',
        padding: '32px 32px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        backgroundColor: palette.background,
        minHeight: '0',
      },
    }, this.surface.getDocument());

    // Initial placeholder
    this.messageListElement.appendChild(
      this.createMessageBubble({
        type: 'system',
        content: this.getEmptyStateMessage(),
        timestamp: new Date(),
      }),
    );

    const body = createElement('div', {
      className: CSS_CLASSES.CHAT_BODY,
      styles: {
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: palette.background,
        minHeight: '0',
        overflow: 'hidden',
      },
    }, this.surface.getDocument());

    body.appendChild(this.messageListElement);
    return body;
  }

  private createActionBar(): HTMLElement {
    const palette = this.getThemePalette();

    this.messageInputElement = createElement('textarea', {
      className: [CSS_CLASSES.MESSAGE_INPUT, CSS_CLASSES.INPUT_FIELD],
      attributes: {
        placeholder:
          this.resolvedParams.placeholder ||
          '',
        rows: '1',
      },
      styles: {
        flex: '1',
        resize: 'none',
        border: 'none',
        outline: 'none',
        fontSize: '14px',
        lineHeight: '20px',
        backgroundColor: 'transparent',
        color: palette.text,
        minHeight: '48px',
      },
    }, this.surface.getDocument()) as HTMLTextAreaElement;

    this.sendButtonElement = createElement('button', {
      className: CSS_CLASSES.SEND_BUTTON,
      attributes: { type: 'button' },
      styles: {
        border: 'none',
        borderRadius: '12px',
        padding: '10px 14px',
        background: '#e5e7eb',
        color: palette.text,
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, opacity 0.2s ease',
      },
      children: ['↑'],
    }, this.surface.getDocument()) as HTMLButtonElement;

    const controls = createElement('div', {
      className: CSS_CLASSES.ACTION_BAR,
      styles: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: palette.surface,
        borderRadius: '10px',
        border: `1px solid ${palette.border}`,
      },
      children: [this.messageInputElement, this.sendButtonElement],
    }, this.surface.getDocument());

    const actionBarWrapper = createElement('div', {
      className: CSS_CLASSES.INPUT_FORM,
      styles: {
        padding: '16px 20px 20px',
        backgroundColor: palette.background,
        flexShrink: '0',
      },
      children: [controls],
    }, this.surface.getDocument());

    return actionBarWrapper;
  }

  private createMessageBubble({
    type,
    content,
    toolStream,
  }: MessageBubblePayload): HTMLElement {
    const palette = this.getThemePalette();

    const isUser = type === 'user';
    const isSystem = type === 'system';
    const fontFamily = this.getFontFamily();
    const monospaceFont = this.getMonospaceFontFamily();

    const wrapper = createElement('div', {
      className: CSS_CLASSES.MESSAGE_CONTAINER,
      styles: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      },
    }, this.surface.getDocument());

    const contentHost = createElement('div', {
      className: [
        CSS_CLASSES.MESSAGE_BUBBLE,
        isUser
          ? CSS_CLASSES.MESSAGE_USER
          : isSystem
            ? CSS_CLASSES.MESSAGE_SYSTEM
            : CSS_CLASSES.MESSAGE_ASSISTANT,
      ].join(' '),
      styles: isUser
        ? {
            maxWidth: '65%',
            padding: '12px 18px',
            borderRadius: '999px',
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.text,
            fontSize: '14px',
            lineHeight: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontFamily,
            textAlign: 'left',
          }
        : {
            maxWidth: '75%',
            padding: '0',
            borderRadius: '0',
            backgroundColor: 'transparent',
            color: palette.text,
            fontSize: '15px',
            lineHeight: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontFamily,
            textAlign: 'left',
          },
    }, this.surface.getDocument());

    const trimmedContent = content?.trim() ?? '';

    if (trimmedContent.length > 0) {
      const markdownElement = renderMarkdown(
        trimmedContent,
        {
          fontFamily,
          monospaceFontFamily: monospaceFont,
        },
        this.surface.getDocument(),
      );

      markdownElement.style.wordBreak = 'break-word';
      markdownElement.style.margin = '0';

      contentHost.appendChild(markdownElement);
    }

    if (toolStream) {
      const accentColor = palette.accent || palette.primary;
      const toolWrapper = createElement('div', {
        styles: {
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '8px 10px',
          borderRadius: '10px',
          border: `1px solid ${accentColor}`,
          backgroundColor: palette.surface,
        },
      }, this.surface.getDocument());

      toolWrapper.appendChild(
        createElement('div', {
          styles: {
            fontSize: '12px',
            fontWeight: '600',
            color: accentColor,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          },
          children: [`Tool • ${toolStream.topic}`],
        }, this.surface.getDocument()),
      );

      const toolContent = createElement('pre', {
        styles: {
          margin: '0',
          padding: '0',
          fontFamily: monospaceFont,
          fontSize: '12px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: palette.textSecondary,
          backgroundColor: 'transparent',
        },
      }, this.surface.getDocument()) as HTMLPreElement;
      toolContent.textContent = toolStream.content;

      toolWrapper.appendChild(toolContent);
      contentHost.appendChild(toolWrapper);
    }

    wrapper.appendChild(contentHost);

    return wrapper;
  }

  private resetDomReferences(): void {
    this.messageListElement = null;
    this.messageInputElement = null;
    this.sendButtonElement = null;
    this.walletStatusElement = null;
  }

  private refreshResolvedParams(): void {
    this.resolvedParams = resolveWidgetParams(this.config.params);
  }

  private registerConfigListeners(): void {
    const listeners = this.config.listeners;
    if (!listeners) return;

    const bindings: Array<{
      key: keyof AomiEventListeners;
      event: string;
    }> = [
      { key: 'onReady', event: WIDGET_EVENTS.READY },
      { key: 'onMessage', event: WIDGET_EVENTS.MESSAGE },
      { key: 'onTransactionRequest', event: WIDGET_EVENTS.TRANSACTION_REQUEST },
      { key: 'onError', event: WIDGET_EVENTS.ERROR },
      { key: 'onSessionStart', event: WIDGET_EVENTS.SESSION_START },
      { key: 'onSessionEnd', event: WIDGET_EVENTS.SESSION_END },
      { key: 'onNetworkChange', event: WIDGET_EVENTS.NETWORK_CHANGE },
      { key: 'onWalletConnect', event: WIDGET_EVENTS.WALLET_CONNECT },
      { key: 'onWalletDisconnect', event: WIDGET_EVENTS.WALLET_DISCONNECT },
    ];

    bindings.forEach(({ key, event }) => {
      const handler = listeners[key];
      if (handler) {
        this.eventEmitter.on(event, handler as () => void);
      }
    });
  }

  private getEventNameForListener(event: keyof AomiEventListeners): string {
    const map: Record<keyof AomiEventListeners, string> = {
      onReady: WIDGET_EVENTS.READY,
      onMessage: WIDGET_EVENTS.MESSAGE,
      onTransactionRequest: WIDGET_EVENTS.TRANSACTION_REQUEST,
      onError: WIDGET_EVENTS.ERROR,
      onSessionStart: WIDGET_EVENTS.SESSION_START,
      onSessionEnd: WIDGET_EVENTS.SESSION_END,
      onNetworkChange: WIDGET_EVENTS.NETWORK_CHANGE,
      onWalletConnect: WIDGET_EVENTS.WALLET_CONNECT,
      onWalletDisconnect: WIDGET_EVENTS.WALLET_DISCONNECT,
    };

    return map[event] || event;
  }

  private bindActionBarEvents(): void {
    if (!this.messageInputElement || !this.sendButtonElement) {
      return;
    }

    this.sendButtonElement.addEventListener('click', () => {
      void this.handleSendMessage();
    });

    this.messageInputElement.addEventListener('input', () => {
      this.autoResizeMessageInput();
    });

    this.messageInputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void this.handleSendMessage();
      }
    });

    this.autoResizeMessageInput();
  }

  private async handleSendMessage(): Promise<void> {
    if (!this.messageInputElement) {
      return;
    }

    const value = this.messageInputElement.value.trim();
    if (!value) {
      return;
    }

    const currentState = this.lastState || this.chatManager.getState();
    if (currentState.connectionStatus !== ConnectionStatus.CONNECTED) {
      this.pushSystemNotification(
        'Waiting for connection before sending messages.',
      );
      return;
    }

    try {
      await this.chatManager.sendMessage(value);
      this.messageInputElement.value = '';
      this.autoResizeMessageInput();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      this.pushSystemNotification(message);
    }
  }

  private autoResizeMessageInput(): void {
    if (!this.messageInputElement) return;

    const minHeight = 48;

    this.messageInputElement.style.height = 'auto';
    const targetHeight = Math.min(
      Math.max(this.messageInputElement.scrollHeight, minHeight),
      180,
    );
    this.messageInputElement.style.height = `${targetHeight}px`;
  }

  private updateStateView(state: ChatState): void {
    if (state.sessionId && state.sessionId !== this.activeSessionId) {
      if (this.activeSessionId) {
        this.eventEmitter.emit(WIDGET_EVENTS.SESSION_END, this.activeSessionId);
      }
      this.activeSessionId = state.sessionId;
      this.eventEmitter.emit(WIDGET_EVENTS.SESSION_START, state.sessionId);
    }


    this.updateMessages(state.messages);
    this.updateWalletStatus();
    this.lastState = state;
  }

  private pushSystemNotification(message: string): void {
    if (!this.messageListElement) return;
    const bubble = this.createMessageBubble({
      type: 'system',
      content: message,
      timestamp: new Date(),
    });
    this.messageListElement.appendChild(bubble);
    this.scrollMessagesToBottom();
  }

  private updateMessages(messages: ChatMessage[]): void {
    if (!this.messageListElement) return;

    this.messageListElement.innerHTML = '';

    if (messages.length === 0) {
      this.messageListElement.appendChild(
        this.createMessageBubble({
          type: 'system',
          content: this.getEmptyStateMessage(),
          timestamp: new Date(),
        }),
      );
    } else {
      messages.forEach((message) => {
        this.messageListElement!.appendChild(
          this.createMessageBubble({
            type: message.type,
            content: message.content,
            timestamp: message.timestamp,
            toolStream: message.toolStream,
          }),
        );
      });
    }
  }

  private scrollMessagesToBottom(): void {
    if (!this.messageListElement) return;
    this.messageListElement.scrollTop = this.messageListElement.scrollHeight;
  }

  private updateWalletStatus(): void {
    if (!this.walletStatusElement) return;

    const palette = this.getThemePalette();
    const isConnected = this.walletManager?.getIsConnected() ?? false;
    const address = this.walletManager?.getCurrentAccount() ?? null;

    if (isConnected && address) {
      this.walletStatusElement.textContent = truncateAddress(address);

      Object.assign(this.walletStatusElement.style, {
        backgroundColor: palette.success,
        border: `1px solid ${palette.success}`,
        color: palette.background,
      });
      return;
    }

    this.walletStatusElement.textContent = 'Connect Wallet';
    Object.assign(this.walletStatusElement.style, {
      backgroundColor: palette.surface,
      border: `1px solid ${palette.border}`,
      color: palette.textSecondary,
    });
  }

  private async handleWalletButtonClick(): Promise<void> {
    if (!this.walletManager) {
      this.pushSystemNotification(
        'No wallet provider configured. Embed with an injected provider to enable transactions.',
      );
      return;
    }

    const isConnected = this.walletManager.getIsConnected();

    this.updateWalletStatus();

    try {
      if (isConnected) {
        this.walletManager.disconnect();
      } else {
        await this.walletManager.connect();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Wallet action failed';
      this.pushSystemNotification(message);
    } finally {
      this.updateWalletStatus();
    }
  }

  private handleConnectionStatusChange(status: ConnectionStatus): void {
    const previousStatus = this.lastState?.connectionStatus;

    if (previousStatus === status) {
      return;
    }

    switch (status) {
      case ConnectionStatus.CONNECTED:
        if (previousStatus && previousStatus !== ConnectionStatus.CONNECTED) {
          this.pushSystemNotification(
            'Connection restored. Preparing services…',
          );
        }
        break;
      case ConnectionStatus.RECONNECTING:
        this.pushSystemNotification(
          'Connection dropped. Attempting to reconnect…',
        );
        break;
      case ConnectionStatus.DISCONNECTED:
        this.pushSystemNotification('Connection lost. We will retry shortly.');
        break;
      case ConnectionStatus.ERROR:
        this.pushSystemNotification(
          'A connection error occurred. Please retry.',
        );
        break;
      default:
        break;
    }
  }

  private updateDimensions(): void {
    this.surface.setDimensions(
      this.resolvedParams.width,
      this.resolvedParams.height,
    );

    if (this.widgetElement) {
      this.widgetElement.style.width = '100%';
      this.widgetElement.style.height = '100%';
    }
  }

  private getThemePalette() {
    return this.resolvedParams.theme.palette;
  }

  private getFontFamily(): string {
    return this.resolvedParams.theme.fonts.primary;
  }

  private getMonospaceFontFamily(): string {
    return this.resolvedParams.theme.fonts.monospace;
  }

  private getWidgetTitle(): string {
    return this.config.params.title?.trim() || 'Aomi Assistant';
  }

  private getEmptyStateMessage(): string {
    return this.config.params.emptyStateMessage?.trim() || 'Chat interface is initializing…';
  }

  private rebuildSurface(): void {
    if (this.surface) {
      this.surface.destroy();
    }

    this.surface = new WidgetSurface(this.container, {
      mode: this.resolvedParams.renderSurface,
      width: this.resolvedParams.width,
      height: this.resolvedParams.height,
    });
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
export function createAomiWidget(
  container: HTMLElement,
  config: WidgetConfig,
): AomiWidgetHandler {
  // Validate environment
  if (!isBrowser()) {
    throw new Error('Widget can only be created in a browser environment');
  }

  // Validate container
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('Container must be a valid HTML element');
  }

  // Validate configuration
  const errors = validateWidgetParams(config.params);
  if (errors.length > 0) {
    throw createWidgetError(
      ERROR_CODES.INVALID_CONFIG,
      `Configuration errors: ${errors.join(', ')}`,
    );
  }

  // Create and return widget handler
  return new DefaultAomiWidget(container, config);
}

// Export the handler class for testing
export { DefaultAomiWidget };
