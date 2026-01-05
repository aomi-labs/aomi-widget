import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import { ReactNode, SetStateAction } from 'react';
import { ThreadMessageLike } from '@assistant-ui/react';
import { ClassValue } from 'clsx';

interface SessionMessage {
    sender?: string;
    content?: string;
    timestamp?: string;
    is_streaming?: boolean;
    tool_stream?: [string, string] | {
        topic?: unknown;
        content?: unknown;
    } | null;
}
interface SessionResponsePayload {
    messages?: SessionMessage[] | null;
    system_events?: unknown[] | null;
    title?: string | null;
    is_processing?: boolean;
    session_exists?: boolean;
    session_id?: string;
    pending_wallet_tx?: string | null;
}
type BackendSessionResponse = SessionResponsePayload;
interface SystemResponsePayload {
    res?: SessionMessage | null;
}
interface BackendThreadMetadata {
    session_id: string;
    title: string;
    is_archived?: boolean;
    created_at?: string;
    updated_at?: string;
    last_active_at?: string;
}
interface CreateThreadResponse {
    session_id: string;
    title?: string;
}
type SystemUpdate = {
    type: "TitleChanged";
    data: {
        session_id: string;
        new_title: string;
    };
};
type SystemUpdateNotification = {
    type: "event_available";
    session_id: string;
    event_id: number;
    event_type: string;
};
type SystemEvent = Record<string, unknown> & {
    type: string;
    session_id: string;
    event_id: number;
};

declare class BackendApi {
    private readonly backendUrl;
    private connectionStatus;
    private eventSource;
    private updatesEventSources;
    constructor(backendUrl: string);
    fetchState(sessionId: string, options?: {
        signal?: AbortSignal;
    }): Promise<SessionResponsePayload>;
    postChatMessage(sessionId: string, message: string, publicKey?: string): Promise<SessionResponsePayload>;
    postSystemMessage(sessionId: string, message: string): Promise<SystemResponsePayload>;
    postInterrupt(sessionId: string): Promise<SessionResponsePayload>;
    disconnectSSE(): void;
    setConnectionStatus(on: boolean): void;
    connectSSE(sessionId: string, publicKey?: string): Promise<void>;
    private handleConnectionError;
    subscribeToUpdates(sessionId: string, onUpdate: (update: SystemUpdateNotification) => void, onError?: (error: unknown) => void): () => void;
    fetchThreads(publicKey: string): Promise<BackendThreadMetadata[]>;
    createThread(publicKey?: string, title?: string): Promise<CreateThreadResponse>;
    archiveThread(sessionId: string): Promise<void>;
    unarchiveThread(sessionId: string): Promise<void>;
    deleteThread(sessionId: string): Promise<void>;
    renameThread(sessionId: string, newTitle: string): Promise<void>;
    fetchEventsAfter(sessionId: string, afterId?: number, limit?: number): Promise<SystemEvent[]>;
    subscribeToUpdatesWithNotification(sessionId: string, onUpdate: (update: SystemUpdateNotification) => void, onError?: (error: unknown) => void): () => void;
}

type WalletButtonState = {
    address?: string;
    chainId?: number;
    isConnected: boolean;
    ensName?: string;
};
type WalletFooterProps = {
    wallet: WalletButtonState;
    setWallet: (data: Partial<WalletButtonState>) => void;
};
type WalletTxRequestPayload = {
    to: string;
    value: string;
    data: string;
    gas?: string | null;
    gas_limit?: string | null;
    description?: string;
    topic?: string;
    timestamp?: string;
};
type WalletTxRequestContext = {
    sessionId: string;
    threadId: string;
    publicKey?: string;
};
type WalletTxRequestHandler = (request: WalletTxRequestPayload, context: WalletTxRequestContext) => Promise<string>;
type Eip1193Provider = {
    request: (args: {
        method: string;
        params?: unknown[];
    }) => Promise<unknown>;
};
declare const getNetworkName: (chainId: number | string | undefined) => string;
declare const formatAddress: (addr?: string) => string;
declare function normalizeWalletError(error: unknown): {
    rejected: boolean;
    message: string;
};
declare function toHexQuantity(value: string): string;
declare function pickInjectedProvider(publicKey?: string): Promise<Eip1193Provider | undefined>;
type WalletSystemMessageEmitterProps = {
    wallet: WalletButtonState;
};
declare function WalletSystemMessageEmitter({ wallet, }: WalletSystemMessageEmitterProps): null;

type AomiRuntimeProviderProps = {
    children: ReactNode;
    backendUrl?: string;
    publicKey?: string;
    onWalletTxRequest?: WalletTxRequestHandler;
};
declare function AomiRuntimeProvider({ children, backendUrl, publicKey, onWalletTxRequest, }: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;
declare function AomiRuntimeProviderWithNotifications(props: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

type RuntimeActions = {
    sendSystemMessage: (message: string) => Promise<void>;
};
declare const RuntimeActionsProvider: react.Provider<RuntimeActions | undefined>;
declare function useRuntimeActions(): RuntimeActions;

type ThreadStatus = "regular" | "archived" | "pending";
type ThreadMetadata = {
    title: string;
    status: ThreadStatus;
    lastActiveAt?: string | number;
};

type ThreadContext$1 = {
    currentThreadId: string;
    setCurrentThreadId: (id: string) => void;
    threadViewKey: number;
    bumpThreadViewKey: () => void;
    threads: Map<string, ThreadMessageLike[]>;
    setThreads: (updater: SetStateAction<Map<string, ThreadMessageLike[]>>) => void;
    threadMetadata: Map<string, ThreadMetadata>;
    setThreadMetadata: (updater: SetStateAction<Map<string, ThreadMetadata>>) => void;
    threadCnt: number;
    setThreadCnt: (updater: SetStateAction<number>) => void;
    getThreadMessages: (threadId: string) => ThreadMessageLike[];
    setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
};

type ThreadContext = ThreadContext$1;
type ThreadContextProviderProps = {
    children: ReactNode;
    initialThreadId?: string;
};
declare function useThreadContext(): ThreadContext;
declare function ThreadContextProvider({ children, initialThreadId, }: ThreadContextProviderProps): react_jsx_runtime.JSX.Element;
declare function useCurrentThreadMessages(): ThreadMessageLike[];
declare function useCurrentThreadMetadata(): ThreadMetadata | undefined;

declare function toInboundMessage(msg: SessionMessage): ThreadMessageLike | null;
declare function toInboundSystem(msg: SessionMessage): ThreadMessageLike | null;

declare function cn(...inputs: ClassValue[]): string;

type NotificationType = "error" | "notice" | "success";
type NotificationIconType = "error" | "success" | "notice" | "wallet" | "transaction" | "network" | "warning";
type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    iconType?: NotificationIconType;
    duration?: number;
};
type NotificationContextValue = {
    showNotification: (notification: Omit<Notification, "id">) => void;
    notifications: Notification[];
    dismissNotification: (id: string) => void;
};
declare function useNotification(): NotificationContextValue;
declare function NotificationProvider({ children }: {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;

export { AomiRuntimeProvider, type AomiRuntimeProviderProps, AomiRuntimeProviderWithNotifications, BackendApi, type BackendSessionResponse, type BackendThreadMetadata, type CreateThreadResponse, type Eip1193Provider, type Notification, type NotificationIconType, NotificationProvider, type NotificationType, RuntimeActionsProvider, type SessionMessage, type SessionResponsePayload, type SystemEvent, type SystemResponsePayload, type SystemUpdate, type SystemUpdateNotification, ThreadContextProvider, type ThreadMetadata, type ThreadStatus, type WalletButtonState, type WalletFooterProps, WalletSystemMessageEmitter, type WalletTxRequestContext, type WalletTxRequestHandler, type WalletTxRequestPayload, cn, toInboundSystem as constructSystemMessage, toInboundMessage as constructThreadMessage, formatAddress, getNetworkName, normalizeWalletError, pickInjectedProvider, toHexQuantity, useCurrentThreadMessages, useCurrentThreadMetadata, useNotification, useRuntimeActions, useThreadContext };
