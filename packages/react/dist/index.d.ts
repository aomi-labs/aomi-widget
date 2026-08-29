import { AomiPlatformFilter, AomiClientOptions, ActionCapabilities, UserState, Action, ActionAttempt, ActionResult, AomiSimulateResponse, Event, TurnState, Session, ChainInfo, AomiAppDescriptor, ApplicationId, AomiClient } from '@aomi-labs/client';
export { Action, ActionRequest, ActionResult, AomiAppDescriptor, AomiClient, AomiClientOptions, AomiPlatformFilter, AomiSecretSlot, ChainInfo, MAX_AUTO_FEE_WEI, NativeWalletExecutionPolicy, NativeWalletSponsorship, SponsorshipPaymasterServiceContext, UserState, ViemSignMessageArgs, WalletCapabilities, WalletEip712Payload, WalletSolanaSignMessagePayload, WalletSolanaSignPayload, WalletTxPayload, aaModeFromExecutionKind, appIdentityKey, appendFeeCallToPayload, buildFeeAAWalletCall, executeWalletCalls, normalizeAppDescriptor, normalizeSimulatedFee, parseChainId, toAAWalletCall, toAAWalletCalls, toViemSignMessageArgs, toViemSignTypedDataArgs } from '@aomi-labs/client';
import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import { ReactNode, SetStateAction } from 'react';
import { ThreadMessageLike } from '@assistant-ui/react';
import { ClassValue } from 'clsx';

type AomiRuntimeProviderProps = {
    children: ReactNode;
    backendUrl?: string;
    applicationId?: number | string | null;
    appPlatforms?: AomiPlatformFilter;
    clientOptions?: Omit<AomiClientOptions, "baseUrl">;
    actions?: ActionCapabilities;
    /** Whether a canonical account session can load threads without a wallet. */
    accountSessionAvailable?: boolean;
    /** Optional explicit initial thread. Takes precedence over stored state. */
    initialThreadId?: string;
    /** Persist the active materialized thread in localStorage. Defaults to true. */
    persistThread?: boolean;
    /** Full localStorage key override for vendors that need exact isolation. */
    threadPersistenceKey?: string;
    /** Extra key segment for tenant/user/app scoping without owning the full key. */
    threadPersistenceScope?: string | null;
};
declare function AomiRuntimeProvider({ children, backendUrl, applicationId, appPlatforms, clientOptions, actions, accountSessionAvailable, initialThreadId, persistThread, threadPersistenceKey, threadPersistenceScope, }: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

type ThreadContext = {
    currentThreadId: string;
    setCurrentThreadId: (id: string) => void;
    threadViewKey: number;
    bumpThreadViewKey: () => void;
    allThreadsMetadata: Map<string, ThreadMetadata>;
    setThreadMetadata: (updater: SetStateAction<Map<string, ThreadMetadata>>) => void;
    threadCnt: number;
    setThreadCnt: (updater: SetStateAction<number>) => void;
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
    resetToDefault: () => string;
};
type ThreadContextProviderProps = {
    children: ReactNode;
    initialThreadId?: string;
};
declare function useThreadContext(): ThreadContext;
declare function ThreadContextProvider({ children, initialThreadId, }: ThreadContextProviderProps): react_jsx_runtime.JSX.Element;
declare function useCurrentThreadMetadata(): ThreadMetadata | undefined;

type ThreadStatus = "regular" | "archived";
type ModelSelectionMode = "auto" | "manual";
type ThreadControlState = {
    model: string | null;
    modelMode?: ModelSelectionMode;
    app: string | null;
    applicationId: number | string | null;
    controlDirty: boolean;
};
type ThreadMetadata = {
    title: string;
    status: ThreadStatus;
    lastActiveAt?: string | number;
    control: ThreadControlState;
};
declare function initThreadControl(): ThreadControlState;

type NotificationType = "notice" | "success" | "error" | "wallet";
type Notification = {
    id: string;
    type: NotificationType;
    /**
     * Optional discriminator for notifications that have a bespoke UI consumer.
     *
     * - `payment_required` is consumed by `PaymentRequiredGate` (apps/shadcn-registry)
     *   as a blocking modal. The toaster skips this kind. As a result, `type`,
     *   `message`, and `duration` are NOT rendered for this kind — only `kind`
     *   matters for routing. Don't bother passing those fields when firing it.
     */
    kind?: "payment_required";
    title: string;
    message?: string;
    duration?: number;
    timestamp: number;
};
type NotificationData = Omit<Notification, "id" | "timestamp">;
type NotificationContextApi = {
    /** All active notifications */
    notifications: Notification[];
    /** Show a new notification */
    showNotification: (params: NotificationData) => string;
    /** Dismiss a notification by ID */
    dismissNotification: (id: string) => void;
    /** Clear all notifications */
    clearAll: () => void;
};
declare function useNotification(): NotificationContextApi;
type NotificationContextProviderProps = {
    children: ReactNode;
};
declare function NotificationContextProvider({ children, }: NotificationContextProviderProps): react_jsx_runtime.JSX.Element;

type AomiRuntimeApi = {
    /** Current user state (wallet connection, address, chain, etc.) */
    user: UserState;
    /** Get current user state synchronously (useful in callbacks) */
    getUserState: () => UserState;
    /** Update user state (partial updates merged with existing state) */
    setUser: (data: Partial<UserState>) => void;
    /** Add or overwrite a value in user_state.ext */
    addExtValue: (key: string, value: unknown) => void;
    /** Remove a value from user_state.ext */
    removeExtValue: (key: string) => void;
    /** ID of the currently active thread */
    currentThreadId: string;
    /** Key that changes when thread view should remount (use for React key prop) */
    threadViewKey: number;
    /** Metadata for all threads (title, status, lastActiveAt) */
    threadMetadata: Map<string, ThreadMetadata>;
    /** True when the authenticated thread list failed to load. */
    threadListError: boolean;
    /** Get metadata for a specific thread */
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    /** Create a new thread and return its ID */
    createThread: () => Promise<string>;
    /** Delete a thread by ID */
    deleteThread: (threadId: string) => Promise<void>;
    /** Rename a thread */
    renameThread: (threadId: string, title: string) => Promise<void>;
    /** Archive a thread */
    archiveThread: (threadId: string) => Promise<void>;
    /** Switch to a thread. If thread doesn't exist, creates a new one. */
    selectThread: (threadId: string) => void;
    /** Whether the assistant is currently generating a response */
    isRunning: boolean;
    /** True only before the first backend event for a submitted turn. */
    isSubmitting: boolean;
    /** Get messages for a thread (defaults to currentThreadId) */
    getMessages: (threadId?: string) => ThreadMessageLike[];
    /** Send a message to the current thread */
    sendMessage: (text: string) => Promise<void>;
    /** Cancel the current generation */
    cancelGeneration: () => void;
    /** All active notifications */
    notifications: Notification[];
    /** Show a notification. Returns the notification ID. */
    showNotification: (params: NotificationData) => string;
    /** Dismiss a notification by ID */
    dismissNotification: (id: string) => void;
    /** Clear all notifications */
    clearAllNotifications: () => void;
    /** Canonical runtime Actions awaiting a client response. */
    pendingActions: Action[];
    actionAttempts: ReadonlyMap<string, ActionAttempt>;
    /** True while an Action is visible or awaiting backend acknowledgement. */
    hasBlockingActions: boolean;
    executeAction: (id: string) => Promise<void>;
    respondToAction: (id: string, result: ActionResult) => Promise<void>;
    rejectAction: (id: string, reason?: string) => Promise<void>;
    /** Simulate a batch against the current thread session context. */
    simulateBatchTransactions: (transactions: Array<{
        to: string;
        value?: string;
        data?: string;
        label?: string;
        chain_id?: number;
        chainId?: number;
    }>, options?: {
        from?: string;
        chainId?: number;
    }) => Promise<AomiSimulateResponse["result"]>;
    /** Canonical ordered events for the active session. */
    events: readonly Event[];
    /** Backend-owned lifecycle for the active turn. */
    turnState?: TurnState;
};
declare const AomiRuntimeApiProvider: react.Provider<AomiRuntimeApi | null>;
/**
 * Unified hook that provides access to all Aomi runtime APIs.
 *
 * This is the primary way to interact with the Aomi runtime from consumer code.
 * It combines user, thread, chat, notification, and event APIs into a single interface.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const aomi = useAomiRuntime();
 *
 *   // User API
 *   const { user, setUser } = aomi;
 *
 *   // Thread API
 *   const { currentThreadId, createThread, selectThread } = aomi;
 *
 *   // Chat API
 *   const { isRunning, sendMessage, cancelGeneration } = aomi;
 *
 *   // Notification API
 *   const { showNotification } = aomi;
 *
 *   // Event state
 *   const { events, turnState } = aomi;
 * }
 * ```
 */
declare function useAomiRuntime(): AomiRuntimeApi;
/** Returns the runtime when mounted, allowing standalone registry previews. */
declare function useOptionalAomiRuntime(): AomiRuntimeApi | null;

declare function useActions(session: Session | undefined): {
    pendingActions: ({
        event_id: string;
        sequence: number;
        turn_id: string | null;
        occurred_at: number;
        type: string;
    } & {
        type: "action";
        id: string;
        revision: number;
        state: "pending" | "submitted" | "completed" | "rejected" | "expired" | "failed";
        request: {
            type: "execute_evm";
            transactions: {
                chain_id: number;
                from: string;
                to: string;
                value?: string;
                gas?: string;
                data: string;
                label: string;
                kind: string;
                protocol?: string;
            }[];
            simulation: {
                status: "passed" | "failed";
                balanceChanges: {
                    account?: string | null;
                    asset: string;
                    amount: string;
                    direction?: "in" | "out" | null;
                    symbol?: string | null;
                    decimals?: number | null;
                    chainId?: number | null;
                    cluster?: string | null;
                }[];
                fees: {
                    account?: string | null;
                    asset: string;
                    amount: string;
                    symbol?: string | null;
                    decimals?: number | null;
                    chainId?: number | null;
                    cluster?: string | null;
                    kind?: string | null;
                }[];
                warnings: string[];
                guards: {
                    name: string;
                    status: "passed" | "failed" | "warning";
                    message?: string | null;
                }[];
                gas: {
                    units?: string | null;
                    priceWei?: string | null;
                    nativeCost?: string | null;
                } | null;
                logs: {
                    chainId?: number | null;
                    cluster?: string | null;
                    address: string;
                    topics: string[];
                    data: string;
                }[];
            };
        } | {
            type: "execute_svm";
            transactions: {
                payer: string;
                cluster: string;
                version: string;
                instructions: Record<string, never>[];
                address_lookup_tables?: string[];
                recent_blockhash?: string;
                last_valid_block_height?: number;
                preserve_blockhash?: boolean;
                unsigned_transaction_base64?: string;
                description: string;
                kind: string;
            }[];
            simulation: {
                status: "passed" | "failed";
                balanceChanges: {
                    account?: string | null;
                    asset: string;
                    amount: string;
                    direction?: "in" | "out" | null;
                    symbol?: string | null;
                    decimals?: number | null;
                    chainId?: number | null;
                    cluster?: string | null;
                }[];
                fees: {
                    account?: string | null;
                    asset: string;
                    amount: string;
                    symbol?: string | null;
                    decimals?: number | null;
                    chainId?: number | null;
                    cluster?: string | null;
                    kind?: string | null;
                }[];
                warnings: string[];
                guards: {
                    name: string;
                    status: "passed" | "failed" | "warning";
                    message?: string | null;
                }[];
                gas: {
                    units?: string | null;
                    priceWei?: string | null;
                    nativeCost?: string | null;
                } | null;
                logs: {
                    chainId?: number | null;
                    cluster?: string | null;
                    address: string;
                    topics: string[];
                    data: string;
                }[];
            };
        } | ({
            requestId: string;
            chainFamily: "evm" | "svm";
            executionKind: string;
            signer: string;
            chainId?: number;
            cluster?: string;
            description: string;
            payloads: ({
                kind: "evm_personal";
                message: string;
            } | {
                kind: "evm_typed_data";
                typed_data: Record<string, never>;
            } | {
                kind: "svm_message";
                message_base64: string;
            } | {
                kind: "svm_transaction";
                transaction_base64: string;
            })[];
            broadcaster?: string;
            operationId?: string;
            executor?: string;
            expiresAt?: string;
            callsDigest?: string;
            calls?: Record<string, never>[];
            fees?: Record<string, never>[];
            sponsorship?: string;
        } & {
            type: "sign";
        });
        result?: ({
            status: "submitted";
            legs: {
                id: string;
                status: "submitted" | "rejected" | "failed" | "skipped";
                transactionId?: string;
                signedTransactionBase64?: string;
                reason?: string;
            }[];
        } | {
            status: "signed";
            outputs: {
                id: string;
                signature?: string;
                signedTransactionBase64?: string;
            }[];
        } | {
            status: "rejected";
            reason: string;
        }) | null;
        created_at: number;
        expires_at: number | null;
    } & {
        type: "action";
    })[];
    actionAttempts: ReadonlyMap<string, ActionAttempt>;
    hasBlockingActions: boolean;
    executeAction: (id: string) => Promise<undefined>;
    respondToAction: (id: string, result: ActionResult) => Promise<undefined>;
    rejectAction: (id: string, reason?: string) => Promise<undefined>;
};

declare function useUser(): {
    user: {
        connection?: {
            is_connected?: boolean;
            provider?: string | null;
            provider_label?: string | null;
            auth_method?: string | null;
        };
        evm?: {
            address?: string | null;
            chain_id?: number | null;
            ens_name?: string | null;
        };
        svm?: {
            address?: string | null;
            cluster?: string | null;
            wallet_name?: string | null;
            transport?: string | null;
            capabilities?: string[];
        };
        preferences?: {
            [key: string]: unknown;
        };
        ext?: {
            [key: string]: unknown;
        };
    };
    setUser: (data: Partial<UserState>) => void;
    addExtValue: (key: string, value: unknown) => void;
    removeExtValue: (key: string) => void;
    getUserState: () => UserState;
};
/**
 * Idempotent provider: if a parent already provided `UserContext`, render
 * children straight through. Otherwise mount a fresh store.
 *
 * The widget layers (`AomiFrame.Root` / `AomiRuntime`) and the wallet-kit
 * wallet-kit layers may both want to be
 * usable standalone. Each historically wrapped with `<ExtUserProvider>` —
 * but when they nest, the inner provider created a *second* store that
 * shadowed the outer. The chat composer would read from one store while
 * `AomiWalletKitSync` wrote to another, so wallet connects never
 * propagated to the chat's `user_state`. Collapsing nested mounts to the
 * outermost store fixes that without forcing host apps to wire the
 * provider themselves.
 */
declare function ExtUserProvider({ children }: {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;

/**
 * Utility function to merge Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 */
declare function cn(...inputs: ClassValue[]): string;
/**
 * Pure Assistant UI projection over the canonical ordered event ledger.
 * Messages and tool parts are grouped by backend turn identity; no transcript
 * or lifecycle state is stored outside ClientSession.
 */
declare function projectAssistantMessages(events: readonly Event[]): ThreadMessageLike[];
/**
 * User configuration props for footer components.
 * Provides user state and setter from UserContext.
 */
type UserConfig = {
    user: UserState;
    setUser: (data: Partial<UserState>) => void;
};
declare const getNetworkName: (chainId: number | string | undefined) => string;
declare const formatAddress: (addr?: string) => string;

/** All chains supported by the application. Sourced from @aomi-labs/client. */
declare const SUPPORTED_CHAINS: ChainInfo[];
/** Look up ChainInfo by chain ID. Returns undefined for unknown chains. */
declare const getChainInfo: (chainId: number | undefined) => ChainInfo | undefined;

type TaskRunStep = {
    kind: "tool_call";
    toolName: string;
    args: unknown;
    resultPreview: string;
    childSeq: number;
} | {
    kind: "note";
    text: string;
    childSeq: number;
};
type TaskRunStatus = "running" | "completed" | "failed" | "stalled" | "cancelled";
type TaskRunState = {
    agentId: string;
    callId: string;
    label: string;
    app: string;
    status: TaskRunStatus;
    startedAt: number;
    phase?: string;
    elapsedMs?: number;
    steps: TaskRunStep[];
    message?: string;
    stagedCount?: number;
    durationMs?: number;
    stepCount?: number;
};
type ThreadTaskRuns = Readonly<Record<string, TaskRunState>>;
declare const EMPTY_TASK_RUNS: ThreadTaskRuns;
declare function selectTaskRuns(events: readonly Event[]): ThreadTaskRuns;
declare function useThreadTaskRuns(): ThreadTaskRuns;
declare function useTaskRun(agentId: string | undefined): TaskRunState | undefined;

/**
 * Resolve the actual backend model for auto mode.
 * Prefers the current auto model before falling back to older balanced defaults
 * and then backend order.
 */
declare function resolveAutoModel(models: string[]): string | null;

type ApiKeyState = {
    apiKey: string | null;
};
type ApiKeyActions = {
    setApiKey: (apiKey: string | null) => void;
};

type StoredByokKey = {
    apiKey: string;
    keyPrefix: string;
    label?: string;
};
type ByokState = {
    byokKeys: Record<string, StoredByokKey>;
};
type SecretsActions = {
    ingestSecrets: (secrets: Record<string, string>) => Promise<Record<string, string>>;
    clearSecrets: () => Promise<void>;
    deleteSecret: (name: string) => Promise<void>;
    /** Stored handle names for this client. Never values. */
    listSecrets: () => Promise<string[]>;
};
type ByokActions = SecretsActions & {
    setByok: (provider: string, apiKey: string, label?: string) => Promise<void>;
    removeByok: (provider: string) => Promise<void>;
    getByokKeys: () => Record<string, StoredByokKey>;
    hasByok: (provider?: string) => boolean;
};

type AuthEndpointsState = {
    availableModels: string[];
    defaultModel: string | null;
    authorizedApps: string[];
    appDescriptors: AomiAppDescriptor[];
    defaultApp: string | null;
};
type AuthEndpointsActions = {
    /** Force a refresh of the models list. */
    getAvailableModels: () => Promise<string[]>;
    /** Force a refresh of the authorized apps list. */
    getAuthorizedApps: () => Promise<string[]>;
};

type AppSelectionOptions = {
    applicationId?: ApplicationId;
};
type PerThreadControlActions = {
    getCurrentThreadControl: () => ThreadControlState;
    getCurrentThreadApp: () => string;
    getCurrentThreadApplicationId: () => ApplicationId;
    getPreferredThreadControl: () => ThreadControlState;
    onModelSelect: (model: string, options?: {
        mode?: ModelSelectionMode;
    }) => Promise<void>;
    onAppSelect: (app: string, options?: AppSelectionOptions) => void;
    markControlSynced: () => void;
};

/**
 * Aggregated control state. Mirrors the historical shape so callers reading
 * `useControl().state` keep working. New code should prefer the focused
 * hooks and read their narrower slices directly.
 */
type ControlState = ApiKeyState & ByokState & AuthEndpointsState & {
    clientId: string | null;
};
type ControlContextApi = ApiKeyActions & ByokActions & AuthEndpointsActions & PerThreadControlActions & {
    state: ControlState;
    /** Synchronous getter used by the runtime to read the latest state from a
     *  callback that fires outside render. */
    getControlState: () => ControlState;
};
declare function useControl(): ControlContextApi;
declare function useApiKey(): {
    state: ApiKeyState & {
        clientId: string | null;
    };
    actions: ApiKeyActions;
};
declare function useByok(): {
    state: ByokState;
    actions: ByokActions;
};
declare function useAuthEndpoints(): {
    state: AuthEndpointsState;
    actions: AuthEndpointsActions;
};
declare function usePerThreadControl(): {
    actions: PerThreadControlActions;
};
type ControlContextProviderProps = {
    children: ReactNode;
    aomiClient: AomiClient;
    sessionId: string;
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    updateThreadMetadata: (threadId: string, partial: Partial<ThreadMetadata>) => void;
    appPlatforms?: AomiPlatformFilter;
    applicationId?: ApplicationId;
};
declare function ControlContextProvider({ children, aomiClient, sessionId, getThreadMetadata, updateThreadMetadata, appPlatforms, applicationId, }: ControlContextProviderProps): react_jsx_runtime.JSX.Element;

export { type AomiRuntimeApi, AomiRuntimeApiProvider, AomiRuntimeProvider, type AomiRuntimeProviderProps, type ControlContextApi, ControlContextProvider, type ControlContextProviderProps, type ControlState, EMPTY_TASK_RUNS, ExtUserProvider, type ModelSelectionMode, type Notification, NotificationContextProvider, type NotificationContextProviderProps, type NotificationContextApi as NotificationContextValue, type NotificationType, SUPPORTED_CHAINS, type NotificationData as ShowNotificationParams, type StoredByokKey, type TaskRunState, type TaskRunStatus, type TaskRunStep, type ThreadContext, ThreadContextProvider, type ThreadControlState, type ThreadMetadata, type ThreadTaskRuns, type UserConfig, cn, formatAddress, getChainInfo, getNetworkName, initThreadControl, projectAssistantMessages, resolveAutoModel, selectTaskRuns, useActions, useAomiRuntime, useApiKey, useAuthEndpoints, useByok, useControl, useCurrentThreadMetadata, useNotification, useOptionalAomiRuntime, usePerThreadControl, useTaskRun, useThreadContext, useThreadTaskRuns, useUser };
