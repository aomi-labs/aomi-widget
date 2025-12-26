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
    is_processing?: boolean;
    session_exists?: boolean;
    session_id?: string;
    pending_wallet_tx?: string | null;
}
type BackendSessionResponse = SessionResponsePayload;
interface SystemResponsePayload {
    res?: SessionMessage | null;
}
interface SessionMetadata {
    session_id: string;
    title: string;
    is_archived?: boolean;
    created_at?: string;
    updated_at?: string;
    last_active_at?: string;
}
interface CreateSessionResponse {
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

declare class BackendApi {
    private readonly backendUrl;
    private connectionStatus;
    private eventSource;
    private updatesEventSource;
    constructor(backendUrl: string);
    fetchState(sessionId: string): Promise<SessionResponsePayload>;
    postChatMessage(sessionId: string, message: string): Promise<SessionResponsePayload>;
    postSystemMessage(sessionId: string, message: string): Promise<SystemResponsePayload>;
    postInterrupt(sessionId: string): Promise<SessionResponsePayload>;
    disconnectSSE(): void;
    setConnectionStatus(on: boolean): void;
    connectSSE(sessionId: string, publicKey?: string): Promise<void>;
    private handleConnectionError;
    subscribeToUpdates(onUpdate: (update: SystemUpdate) => void, onError?: (error: unknown) => void): () => void;
    fetchThreads(publicKey: string): Promise<SessionMetadata[]>;
    createThread(publicKey?: string, title?: string): Promise<CreateSessionResponse>;
    archiveThread(sessionId: string): Promise<void>;
    unarchiveThread(sessionId: string): Promise<void>;
    deleteThread(sessionId: string): Promise<void>;
    renameThread(sessionId: string, newTitle: string): Promise<void>;
}

type AomiRuntimeProviderProps = {
    children: ReactNode;
    backendUrl?: string;
    publicKey?: string;
};
declare function AomiRuntimeProvider({ children, backendUrl, publicKey, }: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

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

type ThreadContextValue = {
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

type ThreadContextProviderProps = {
    children: ReactNode;
    initialThreadId?: string;
};
declare function useThreadContext(): ThreadContextValue;
declare function ThreadContextProvider({ children, initialThreadId, }: ThreadContextProviderProps): react_jsx_runtime.JSX.Element;
declare function useCurrentThreadMessages(): ThreadMessageLike[];
declare function useCurrentThreadMetadata(): ThreadMetadata | undefined;

declare function constructThreadMessage(msg: SessionMessage): ThreadMessageLike | null;
declare function constructSystemMessage(msg: SessionMessage): ThreadMessageLike | null;

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
declare const getNetworkName: (chainId: number | string | undefined) => string;
declare const formatAddress: (addr?: string) => string;
type WalletSystemMessageEmitterProps = {
    wallet: WalletButtonState;
};
declare function WalletSystemMessageEmitter({ wallet }: WalletSystemMessageEmitterProps): null;

declare function cn(...inputs: ClassValue[]): string;

export { AomiRuntimeProvider, BackendApi, type BackendSessionResponse, type SessionMetadata, type CreateSessionResponse, RuntimeActionsProvider, type SessionMessage, type SessionResponsePayload, type SystemResponsePayload, type SystemUpdate, ThreadContextProvider, type ThreadMetadata, type ThreadStatus, type WalletButtonState, type WalletFooterProps, WalletSystemMessageEmitter, cn, constructSystemMessage, constructThreadMessage, formatAddress, getNetworkName, useCurrentThreadMessages, useCurrentThreadMetadata, useRuntimeActions, useThreadContext };
