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
  type ResolvedAomiChatWidgetParams,
} from '../types';
import {
  createConfigurationError,
  createConnectionError,
  AomiChatError as AomiError,
} from '../types/errors';
import {
  ERROR_CODES,
  DEFAULT_WIDGET_HEIGHT,
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
} from '../utils';
import { renderMarkdown } from '../utils/markdown';
import { resolveWidgetParams } from '../utils/widgetParams';
import { ChatManager } from './ChatManager';
import { WalletManager } from './WalletManager';
import { WidgetSurface } from './WidgetSurface';

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

class DefaultAomiWidget implements AomiChatWidgetHandler {
  private container: HTMLElement;
  private config: WidgetConfig;
  private chatManager: ChatManager;
  private walletManager: WalletManager | null = null;
  private widgetElement: HTMLElement | null = null;
  private messageListElement: HTMLElement | null = null;
  private typingIndicatorElement: HTMLElement | null = null;
  private inputFormElement: HTMLFormElement | null = null;
  private messageInputElement: HTMLTextAreaElement | null = null;
  private sendButtonElement: HTMLButtonElement | null = null;
  private walletStatusElement: HTMLButtonElement | null = null;
  private isDestroyed = false;
  private eventEmitter: EventEmitter;
  private lastState: ChatState | null = null;
  private isSending = false;
  private hasAnnouncedConnection = false;
  private isWalletActionPending = false;
  private activeSessionId: string | null = null;
  private chatInterfaceElement: HTMLElement | null = null;
  private chatBodyElement: HTMLElement | null = null;
  private layoutResizeObserver: ResizeObserver | null = null;
  private layoutResizeListener: (() => void) | null = null;
  private layoutMeasurementFrame: number | null = null;
  private surface!: WidgetSurface;
  private viewDocument!: Document;
  private mountRoot!: HTMLElement;
  private resolvedParams!: ResolvedAomiChatWidgetParams;

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
    if (this.isDestroyed) {
      throw new AomiError(
        ERROR_CODES.INITIALIZATION_FAILED,
        'Widget has been destroyed',
      );
    }

    return this.chatManager.sendMessage(message);
  }

  public updateParams(params: Partial<AomiChatWidgetParams>): void {
    if (this.isDestroyed) {
      throw new AomiError(
        ERROR_CODES.INITIALIZATION_FAILED,
        'Widget has been destroyed',
      );
    }

    // Validate new parameters
    const mergedParams = { ...this.config.params, ...params };
    const errors = validateWidgetParams(mergedParams);

    if (errors.length > 0) {
      throw createConfigurationError(
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
    if (this.isDestroyed) {
      throw new AomiError(
        ERROR_CODES.INITIALIZATION_FAILED,
        'Widget has been destroyed',
      );
    }

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
    const eventName = this.getEventNameForListener(event);
    this.eventEmitter.on(eventName, listener as any);
    return this;
  }

  public off<K extends keyof AomiChatEventListeners>(
    event: K,
    listener: NonNullable<AomiChatEventListeners[K]>,
  ): AomiChatWidgetHandler {
    const eventName = this.getEventNameForListener(event);
    this.eventEmitter.off(eventName, listener as any);
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

    this.refreshResolvedParams();
    this.updateDimensions();
    this.eventEmitter.emit(WIDGET_EVENTS.RESIZE, {
      width: parseInt(width || this.resolvedParams.width || '0', 10),
      height: parseInt(height || this.resolvedParams.height || '0', 10),
    });
  }

  public focus(): void {
    if (this.isDestroyed || !this.widgetElement) return;

    const input = this.widgetElement.querySelector(
      'input, textarea',
    ) as HTMLElement;
    if (input) {
      input.focus();
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.teardownLayoutObservers();

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

      // Send welcome message if configured
      if (this.resolvedParams.welcomeMessage) {
        await this.chatManager.sendSystemMessage(
          this.resolvedParams.welcomeMessage,
        );
      }

      this.eventEmitter.emit(WIDGET_EVENTS.READY);
    } catch (error) {
      const chatError =
        error instanceof AomiError
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
      this.chatManager.updateWalletState({
        isConnected: true,
        address,
        chainId: this.walletManager?.getCurrentChainId() ?? undefined,
        networkName: this.walletManager?.getCurrentNetworkName() ?? undefined,
      });
      this.eventEmitter.emit(WIDGET_EVENTS.WALLET_CONNECT, address);
      this.pushSystemNotification(
        `Wallet connected: ${truncateAddress(address)}`,
      );
      this.updateWalletStatus(this.chatManager.getState());
      this.refreshResolvedParams();
      this.render();
    });

    this.walletManager.on('disconnect', () => {
      this.chatManager.updateWalletState({
        isConnected: false,
        address: undefined,
        chainId: undefined,
        networkName: undefined,
      });
      this.eventEmitter.emit(WIDGET_EVENTS.WALLET_DISCONNECT);
      this.pushSystemNotification('Wallet disconnected.');
      this.updateWalletStatus(this.chatManager.getState());
      this.refreshResolvedParams();
      this.render();
    });

    this.walletManager.on('chainChange', (chainId) => {
      this.chatManager.updateWalletState({
        chainId,
        networkName: this.walletManager?.getCurrentNetworkName() ?? undefined,
      });
      this.eventEmitter.emit(WIDGET_EVENTS.NETWORK_CHANGE, chainId);
      this.pushSystemNotification(
        `Switched to ${SUPPORTED_CHAINS[chainId] || `chain ${chainId}`}.`,
      );
      this.updateWalletStatus(this.chatManager.getState());
      this.refreshResolvedParams();
      this.render();
    });

    this.walletManager.on('error', (error) => {
      this.eventEmitter.emit(WIDGET_EVENTS.ERROR, error);
      this.updateWalletStatus(this.chatManager.getState());
    });
  }

  private forwardStateEvents(state: ChatState): void {
    this.updateStateView(state);
    // Forward typing and processing changes
    this.eventEmitter.emit(WIDGET_EVENTS.TYPING_CHANGE, state.isTyping);
    this.eventEmitter.emit(WIDGET_EVENTS.PROCESSING_CHANGE, state.isProcessing);
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
    this.teardownLayoutObservers();
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
    }, this.viewDocument);

    // Render chat interface
    this.renderChatInterface();

    // Add to container
    this.mountRoot.appendChild(this.widgetElement);
    this.initializeLayoutObservers();
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
    }, this.viewDocument);

    this.chatInterfaceElement = chatInterface;

    const header = this.createHeader();
    const body = this.createBody();
    const actionBar = this.createActionBar();

    this.chatBodyElement = body;

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
      children: [this.resolvedParams.content.welcomeTitle],
    }, this.viewDocument);

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
    }, this.viewDocument) as HTMLButtonElement;

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
    }, this.viewDocument);

    header.appendChild(title);
    header.appendChild(this.walletStatusElement);

    this.updateWalletStatus(this.chatManager.getState());
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
    }, this.viewDocument);

    // Initial placeholder
    this.messageListElement.appendChild(
      this.createMessageBubble({
        type: 'system',
        content: this.resolvedParams.content.emptyStateMessage,
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
    }, this.viewDocument);

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
    }, this.viewDocument) as HTMLTextAreaElement;

    this.sendButtonElement = createElement('button', {
      className: CSS_CLASSES.SEND_BUTTON,
      attributes: { type: 'submit' },
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
    }, this.viewDocument) as HTMLButtonElement;

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
    }, this.viewDocument);

    this.inputFormElement = createElement('form', {
      className: CSS_CLASSES.INPUT_FORM,
      styles: {
        padding: '16px 20px 20px',
        backgroundColor: palette.background,
        flexShrink: '0',
      },
      children: [controls],
    }, this.viewDocument) as HTMLFormElement;

    return this.inputFormElement;
  }

  private initializeLayoutObservers(): void {
    if (!isBrowser()) return;

    this.teardownLayoutObservers();

    if (this.chatInterfaceElement && typeof ResizeObserver !== 'undefined') {
      this.layoutResizeObserver = new ResizeObserver(() => {
        this.scheduleLayoutMeasurement();
      });
      this.layoutResizeObserver.observe(this.chatInterfaceElement);
    }

    this.layoutResizeListener = () => {
      this.scheduleLayoutMeasurement(true);
    };

    window.addEventListener('resize', this.layoutResizeListener);
    this.scheduleLayoutMeasurement(true);
  }

  private teardownLayoutObservers(): void {
    if (this.layoutResizeObserver) {
      this.layoutResizeObserver.disconnect();
      this.layoutResizeObserver = null;
    }

    if (this.layoutResizeListener) {
      window.removeEventListener('resize', this.layoutResizeListener);
      this.layoutResizeListener = null;
    }

    if (this.layoutMeasurementFrame !== null) {
      window.cancelAnimationFrame(this.layoutMeasurementFrame);
      this.layoutMeasurementFrame = null;
    }
  }

  private scheduleLayoutMeasurement(force = false): void {
    if (!isBrowser()) return;

    if (this.layoutMeasurementFrame !== null) {
      if (!force) {
        return;
      }

      window.cancelAnimationFrame(this.layoutMeasurementFrame);
      this.layoutMeasurementFrame = null;
    }

    this.layoutMeasurementFrame = window.requestAnimationFrame(() => {
      this.layoutMeasurementFrame = null;
      this.applyWidgetViewportClamp();
      this.updateScrollableRegion();
    });
  }

  private applyWidgetViewportClamp(): void {
    if (!this.widgetElement || !isBrowser()) return;

    const viewportHeight =
      window.innerHeight || document.documentElement?.clientHeight || 0;

    if (!viewportHeight) {
      return;
    }

    const margin = 32;
    const maxHeight =
      viewportHeight > margin ? viewportHeight - margin : viewportHeight;

    if (maxHeight <= 0) {
      return;
    }

    const configuredHeightPx = this.parsePixelValue(this.resolvedParams.height);
    const defaultHeightPx = this.parsePixelValue(DEFAULT_WIDGET_HEIGHT) ?? 0;

    if (configuredHeightPx !== null) {
      const targetHeight = Math.min(configuredHeightPx, maxHeight);
      this.widgetElement.style.height = `${targetHeight}px`;
      this.widgetElement.style.maxHeight = `${maxHeight}px`;
    } else if (defaultHeightPx) {
      const targetHeight = Math.min(defaultHeightPx, maxHeight);
      this.widgetElement.style.height = `${targetHeight}px`;
      this.widgetElement.style.maxHeight = `${maxHeight}px`;
    } else {
      this.widgetElement.style.maxHeight = `${maxHeight}px`;
    }
  }

  private updateScrollableRegion(): void {
    if (!this.chatBodyElement || !this.messageListElement) return;

    const bodyRect = this.chatBodyElement.getBoundingClientRect();
    if (!bodyRect.height) return;

    let typingHeight = 0;
    if (
      this.typingIndicatorElement &&
      this.typingIndicatorElement.style.display !== 'none'
    ) {
      typingHeight =
        this.typingIndicatorElement.getBoundingClientRect().height || 0;
    }

    const availableHeight = Math.max(bodyRect.height - typingHeight, 0);

    if (availableHeight > 0) {
      this.messageListElement.style.maxHeight = `${availableHeight}px`;
      this.messageListElement.style.height = `${availableHeight}px`;
    } else {
      this.messageListElement.style.maxHeight = '';
      this.messageListElement.style.height = '';
    }
  }

  private parsePixelValue(value?: string): number | null {
    if (!value) return null;

    const trimmed = value.trim().toLowerCase();
    if (!trimmed.endsWith('px')) {
      return null;
    }

    const numeric = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(numeric) ? numeric : null;
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
    }, this.viewDocument);

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
    }, this.viewDocument);

    const trimmedContent = content?.trim() ?? '';

    if (trimmedContent.length > 0) {
      const markdownElement = renderMarkdown(
        trimmedContent,
        {
          fontFamily,
          monospaceFontFamily: monospaceFont,
        },
        this.viewDocument,
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
      }, this.viewDocument);

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
        }, this.viewDocument),
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
      }, this.viewDocument) as HTMLPreElement;
      toolContent.textContent = toolStream.content;

      toolWrapper.appendChild(toolContent);
      contentHost.appendChild(toolWrapper);
    }

    wrapper.appendChild(contentHost);

    return wrapper;
  }

  private resetDomReferences(): void {
    this.messageListElement = null;
    this.typingIndicatorElement = null;
    this.inputFormElement = null;
    this.messageInputElement = null;
    this.sendButtonElement = null;
    this.walletStatusElement = null;
    this.chatInterfaceElement = null;
    this.chatBodyElement = null;
  }

  private refreshResolvedParams(): void {
    this.resolvedParams = resolveWidgetParams(this.config.params);
  }

  private registerConfigListeners(): void {
    const listeners = this.config.listeners;
    if (!listeners) return;

    const bindings: Array<{
      key: keyof AomiChatEventListeners;
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
      { key: 'onTypingChange', event: WIDGET_EVENTS.TYPING_CHANGE },
      { key: 'onProcessingChange', event: WIDGET_EVENTS.PROCESSING_CHANGE },
      { key: 'onConnectionChange', event: WIDGET_EVENTS.CONNECTION_CHANGE },
      { key: 'onResize', event: WIDGET_EVENTS.RESIZE },
    ];

    bindings.forEach(({ key, event }) => {
      const handler = listeners[key];
      if (handler) {
        this.eventEmitter.on(event, handler as () => void);
      }
    });
  }

  private getEventNameForListener(event: keyof AomiChatEventListeners): string {
    const map: Record<keyof AomiChatEventListeners, string> = {
      onReady: WIDGET_EVENTS.READY,
      onMessage: WIDGET_EVENTS.MESSAGE,
      onTransactionRequest: WIDGET_EVENTS.TRANSACTION_REQUEST,
      onError: WIDGET_EVENTS.ERROR,
      onSessionStart: WIDGET_EVENTS.SESSION_START,
      onSessionEnd: WIDGET_EVENTS.SESSION_END,
      onNetworkChange: WIDGET_EVENTS.NETWORK_CHANGE,
      onWalletConnect: WIDGET_EVENTS.WALLET_CONNECT,
      onWalletDisconnect: WIDGET_EVENTS.WALLET_DISCONNECT,
      onTypingChange: WIDGET_EVENTS.TYPING_CHANGE,
      onProcessingChange: WIDGET_EVENTS.PROCESSING_CHANGE,
      onConnectionChange: WIDGET_EVENTS.CONNECTION_CHANGE,
      onResize: WIDGET_EVENTS.RESIZE,
    };

    return map[event] || event;
  }

  private bindActionBarEvents(): void {
    if (
      !this.inputFormElement ||
      !this.messageInputElement ||
      !this.sendButtonElement
    ) {
      return;
    }

    this.inputFormElement.addEventListener('submit', (event) => {
      event.preventDefault();
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
    if (this.isDestroyed || this.isSending || !this.messageInputElement) {
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

    this.isSending = true;
    this.updateInputControls(currentState, true);

    try {
      await this.chatManager.sendMessage(value);
      this.messageInputElement.value = '';
      this.autoResizeMessageInput();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      this.pushSystemNotification(message);
    } finally {
      this.isSending = false;
      this.updateInputControls(this.chatManager.getState());
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
    this.scheduleLayoutMeasurement();
  }

  private updateStateView(state: ChatState): void {
    const previousState = this.lastState;

    if (state.sessionId && state.sessionId !== this.activeSessionId) {
      if (this.activeSessionId) {
        this.eventEmitter.emit(WIDGET_EVENTS.SESSION_END, this.activeSessionId);
      }
      this.activeSessionId = state.sessionId;
      this.eventEmitter.emit(WIDGET_EVENTS.SESSION_START, state.sessionId);
    }

    if (
      previousState?.readiness.phase !== ReadinessPhase.READY &&
      state.readiness.phase === ReadinessPhase.READY
    ) {
      if (!this.hasAnnouncedConnection) {
        this.pushSystemNotification(
          'Assistant is ready. Ask your first question!',
        );
      }
      this.hasAnnouncedConnection = true;
    }

    if (state.readiness.phase !== ReadinessPhase.READY) {
      this.hasAnnouncedConnection = false;
    }

    this.updateMessages(state.messages);
    this.updateTypingIndicator(state.isTyping || state.isProcessing);
    this.updateInputControls(state);
    this.updateWalletStatus(state);
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
    this.scheduleLayoutMeasurement();
  }

  private updateMessages(messages: ChatMessage[]): void {
    if (!this.messageListElement) return;

    this.messageListElement.innerHTML = '';

    if (messages.length === 0) {
      this.messageListElement.appendChild(
        this.createMessageBubble({
          type: 'system',
          content: this.resolvedParams.content.emptyStateMessage,
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

    this.scheduleLayoutMeasurement();
  }

  private scrollMessagesToBottom(): void {
    if (!this.messageListElement) return;
    this.messageListElement.scrollTop = this.messageListElement.scrollHeight;
  }

  private updateTypingIndicator(isTyping: boolean): void {
    if (!this.typingIndicatorElement) return;
    this.typingIndicatorElement.style.display = isTyping ? 'flex' : 'none';
    this.scheduleLayoutMeasurement();
  }

  private updateInputControls(state: ChatState, forceDisable = false): void {
    if (!this.messageInputElement || !this.sendButtonElement) return;

    const backendReady = state.readiness.phase === ReadinessPhase.READY;
    const fatalReadiness =
      state.readiness.phase === ReadinessPhase.MISSING_API_KEY ||
      state.readiness.phase === ReadinessPhase.ERROR;
    const backendBusy = !backendReady && !fatalReadiness;

    const inputDisabled =
      forceDisable || state.isProcessing || backendBusy || fatalReadiness;

    const sendDisabled =
      forceDisable ||
      state.connectionStatus !== ConnectionStatus.CONNECTED ||
      state.isProcessing ||
      backendBusy ||
      fatalReadiness;

    this.messageInputElement.readOnly = inputDisabled;
    this.messageInputElement.disabled = inputDisabled;
    this.messageInputElement.setAttribute(
      'aria-disabled',
      inputDisabled ? 'true' : 'false',
    );
    this.sendButtonElement.disabled = sendDisabled;

    this.sendButtonElement.style.opacity = sendDisabled ? '0.6' : '1';
    this.sendButtonElement.style.cursor = sendDisabled
      ? 'not-allowed'
      : 'pointer';

    const defaultPlaceholder = this.resolvedParams.placeholder || '';
    let placeholder = defaultPlaceholder;

    if (fatalReadiness) {
      placeholder = 'Backend configuration error. Please verify server setup.';
    } else if (state.connectionStatus !== ConnectionStatus.CONNECTED) {
      placeholder = 'Connecting to backend…';
    } else if (backendBusy) {
      placeholder = 'Preparing backend services…';
    } else if (state.isProcessing) {
      placeholder = 'Processing your previous request…';
    }

    this.messageInputElement.placeholder = placeholder;
  }

  private updateWalletStatus(state: ChatState): void {
    if (!this.walletStatusElement) return;

    const palette = this.getThemePalette();

    if (!this.walletManager) {
      this.walletStatusElement.textContent = 'Wallet Unavailable';
      this.walletStatusElement.disabled = true;
      this.walletStatusElement.title =
        'Provide an Ethereum provider to enable wallet features.';
      Object.assign(this.walletStatusElement.style, {
        backgroundColor: palette.surface,
        border: `1px dashed ${palette.border}`,
        color: palette.textSecondary,
        cursor: 'not-allowed',
      });
      return;
    }

    this.walletStatusElement.disabled = this.isWalletActionPending;
    this.walletStatusElement.style.cursor = this.isWalletActionPending
      ? 'wait'
      : 'pointer';

    if (this.isWalletActionPending) {
      this.walletStatusElement.textContent = 'Working…';
      Object.assign(this.walletStatusElement.style, {
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        color: palette.textSecondary,
      });
      return;
    }

    const { walletState } = state;
    if (walletState.isConnected && walletState.address) {
      const chainName =
        walletState.networkName ||
        (walletState.chainId
          ? SUPPORTED_CHAINS[walletState.chainId]
          : undefined);

      this.walletStatusElement.textContent = truncateAddress(
        walletState.address,
      );
      this.walletStatusElement.title = chainName
        ? `Connected to ${chainName}`
        : 'Wallet connected';

      Object.assign(this.walletStatusElement.style, {
        backgroundColor: palette.success,
        border: `1px solid ${palette.success}`,
        color: palette.background,
      });
    } else {
      this.walletStatusElement.textContent = 'Connect Wallet';
      this.walletStatusElement.title = 'Connect an Ethereum wallet';
      Object.assign(this.walletStatusElement.style, {
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        color: palette.textSecondary,
      });
    }
  }

  private async handleWalletButtonClick(): Promise<void> {
    if (this.isWalletActionPending) {
      return;
    }

    if (!this.walletManager) {
      this.pushSystemNotification(
        'No wallet provider configured. Embed with an injected provider to enable transactions.',
      );
      return;
    }

    const currentState = this.lastState || this.chatManager.getState();
    const isConnected = currentState.walletState.isConnected;

    this.isWalletActionPending = true;
    this.updateWalletStatus(currentState);

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
      this.isWalletActionPending = false;
      this.updateWalletStatus(this.chatManager.getState());
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
        this.hasAnnouncedConnection = false;
        break;
      case ConnectionStatus.DISCONNECTED:
        this.pushSystemNotification('Connection lost. We will retry shortly.');
        this.hasAnnouncedConnection = false;
        break;
      case ConnectionStatus.ERROR:
        this.pushSystemNotification(
          'A connection error occurred. Please retry.',
        );
        this.hasAnnouncedConnection = false;
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

    this.scheduleLayoutMeasurement(true);
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

  private rebuildSurface(): void {
    if (this.surface) {
      this.surface.destroy();
    }

    this.surface = new WidgetSurface(this.container, {
      mode: this.resolvedParams.renderSurface,
      width: this.resolvedParams.width,
      height: this.resolvedParams.height,
    });
    this.viewDocument = this.surface.getDocument();
    this.mountRoot = this.surface.getRoot();
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
  return new DefaultAomiWidget(container, config);
}

// Export the handler class for testing
export { DefaultAomiWidget };
