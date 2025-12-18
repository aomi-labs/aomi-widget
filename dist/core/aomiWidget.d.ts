import { type OptionalParam, type AomiWidgetHandler, type WidgetConfig, type ChatState, type AomiEventListeners, type EthereumProvider, type ChatMessage } from '../types/interface';
declare class DefaultAomiWidget implements AomiWidgetHandler {
    private container;
    private config;
    private chatManager;
    private walletManager;
    private widgetElement;
    private messageListElement;
    private messageInputElement;
    private sendButtonElement;
    private walletStatusElement;
    private eventEmitter;
    private lastState;
    private activeSessionId;
    private surface;
    private resolvedParams;
    constructor(container: HTMLElement, config: WidgetConfig);
    sendMessage(message: string): Promise<void>;
    updateParams(params: Partial<OptionalParam>): void;
    updateProvider(provider?: EthereumProvider): void;
    getState(): ChatState;
    getSessionId(): string;
    isReady(): boolean;
    on<K extends keyof AomiEventListeners>(event: K, listener: NonNullable<AomiEventListeners[K]>): AomiWidgetHandler;
    off<K extends keyof AomiEventListeners>(event: K, listener: NonNullable<AomiEventListeners[K]>): AomiWidgetHandler;
    clearChat(): void;
    exportChat(): ChatMessage[];
    focus(): void;
    destroy(): void;
    private initialize;
    private setupEventListeners;
    private setupWalletEventListeners;
    private forwardStateEvents;
    private handleTransactionRequest;
    private render;
    private renderChatInterface;
    private createHeader;
    private createBody;
    private createActionBar;
    private createMessageBubble;
    private resetDomReferences;
    private refreshResolvedParams;
    private registerConfigListeners;
    private getEventNameForListener;
    private bindActionBarEvents;
    private handleSendMessage;
    private autoResizeMessageInput;
    private updateStateView;
    private pushSystemNotification;
    private updateMessages;
    private scrollMessagesToBottom;
    private updateWalletStatus;
    private handleWalletButtonClick;
    private handleConnectionStatusChange;
    private updateDimensions;
    private getThemePalette;
    private getFontFamily;
    private getMonospaceFontFamily;
    private getWidgetTitle;
    private getEmptyStateMessage;
    private rebuildSurface;
}
/**
 * Creates and initializes an Aomi Chat Widget
 */
export declare function createAomiWidget(container: HTMLElement, config: WidgetConfig): AomiWidgetHandler;
export { DefaultAomiWidget };
//# sourceMappingURL=aomiWidget.d.ts.map