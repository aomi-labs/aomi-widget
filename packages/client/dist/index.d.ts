import { x402Client, x402HTTPClient } from '@x402/core/client';
import * as viem from 'viem';
import { Hex, Chain } from 'viem';

declare function address(userState?: UserState | null): string | undefined;
declare function svmAddress(userState?: UserState | null): string | undefined;
declare function chainId(userState?: UserState | null): number | undefined;
declare function ensName(userState?: UserState | null): string | undefined;
declare function isConnected(userState?: UserState | null): boolean | undefined;
declare function walletProvider(userState?: UserState | null): UserStateWalletProvider | null | undefined;
declare function walletProviderSubject(userState?: UserState | null): string | null | undefined;
declare function authMethod(userState?: UserState | null): UserStateAuthMethod | null | undefined;
declare function authValue(userState?: UserState | null): string | null | undefined;
declare function authVerifiedAt(userState?: UserState | null): number | null | undefined;
declare function withExt(userState: UserState, key: string, value: unknown): UserState;

declare function normalizeUserState(userState?: UserState | null): UserState | undefined;
declare function reconcileUserState(previousUserState?: UserState | null, incomingUserState?: UserState | null): UserState | undefined;
/**
 * Project a stored `UserState` down to the subset the client owns and may send
 * to the backend. `pending` is backend-authority in-flight state and is dropped
 * so the client never echoes it back. Apply at the transport send boundary.
 */
declare function toOwnedUserState(userState?: UserState | null): OwnedUserState | undefined;

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 *
 * Account-abstraction and sponsorship are backend authority: they are resolved
 * by the `execution-profile` endpoint and per-execution operation payloads, and
 * are deliberately NOT part of this wire shape. The client never sends or stores
 * them here.
 */
type UserStateAAMode = "none" | "4337" | "7702";
type UserStateWalletProvider = "para" | "privy" | "baseAccount";
type UserStateAuthMethod = "google" | "apple" | "facebook" | "x" | "discord" | "github" | "farcaster" | "telegram" | "email" | "phone" | "wagmi";
/** Session-level connection facts shared across chain families. */
interface UserStateConnection extends Record<string, unknown> {
    is_connected?: boolean | null;
    provider?: UserStateWalletProvider | null;
    provider_label?: string | null;
    wallet_provider_subject?: string | null;
    auth_method?: UserStateAuthMethod | null;
    auth_value?: string | null;
    auth_verified_at?: number | string | null;
}
/** EVM-family wallet block (`evm`). */
interface UserStateEvm extends Record<string, unknown> {
    address?: string | null;
    chain_id?: number | string | null;
    ens_name?: string | null;
}
/** Solana-family wallet block (`svm`). */
interface UserStateSvm extends Record<string, unknown> {
    address?: string | null;
    cluster?: string | null;
    wallet_name?: string | null;
    transport?: string | null;
    /** Wallet-Standard capability identifiers, e.g. `"can_sign_message"`. */
    capabilities?: string[] | null;
}
/**
 * Backend-pushed in-flight wallet requests, chain-bucketed. Shape is owned by
 * the backend; parsed by helpers like `pendingTxsFromBackendUserState`. The
 * client forwards them transparently via reconciliation.
 */
interface UserStatePending extends Record<string, unknown> {
    evm_txs?: Record<string, unknown> | null;
    evm_sigs?: Record<string, unknown> | null;
    svm_ixs?: Record<string, unknown> | null;
    svm_sigs?: Record<string, unknown> | null;
}
/**
 * The subset of `UserState` the client OWNS and may send to the backend.
 * `pending` is backend-authority in-flight state; the client receives it but
 * never echoes it back. Use {@link toOwnedUserState} to project a stored
 * `UserState` down to this shape at the send boundary.
 */
type OwnedUserState = Omit<UserState, "pending">;
/**
 * Known client surfaces that may want backend-specific UX strategies.
 * Additional string values are allowed for forward compatibility.
 */
type AomiClientType = "ts_cli" | "web_ui" | (string & {});
declare const CLIENT_TYPE_TS_CLI: AomiClientType;
declare const CLIENT_TYPE_WEB_UI: AomiClientType;
/**
 * Client-side user state, canonicalized to the backend's nested snake_case
 * wire shape. EVM and Solana identities are independent blocks (`evm` / `svm`)
 * so a single session can carry both families at once. `normalize` accepts the
 * backend's nested camelCase responses and legacy flat host input, and emits
 * this canonical shape.
 */
interface UserState extends Record<string, unknown> {
    connection?: UserStateConnection | null;
    evm?: UserStateEvm | null;
    svm?: UserStateSvm | null;
    pending?: UserStatePending | null;
    ext?: Record<string, unknown> | null;
    preferences?: Record<string, unknown> | null;
}
declare namespace UserState {
    const normalize: typeof normalizeUserState;
    const reconcile: typeof reconcileUserState;
    const toOwned: typeof toOwnedUserState;
    const address: typeof address;
    const evmAddress: typeof address;
    const svmAddress: typeof svmAddress;
    const chainId: typeof chainId;
    const ensName: typeof ensName;
    const isConnected: typeof isConnected;
    const walletProvider: typeof walletProvider;
    const walletProviderSubject: typeof walletProviderSubject;
    const authMethod: typeof authMethod;
    const authValue: typeof authValue;
    const authVerifiedAt: typeof authVerifiedAt;
    const withExt: typeof withExt;
}

type AomiOAuthResource = `${string}/v1/agent` | `${string}/v1/pipeline` | `${string}/agent/mcp` | `${string}/pipeline/mcp`;
type AomiOAuthTokenSet = {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    resource: AomiOAuthResource;
    scopes: readonly string[];
    tokenType?: "Bearer" | "DPoP";
    dpopProof?: (input: {
        url: string;
        method: string;
        accessToken: string;
        nonce?: string;
    }) => Promise<string>;
};
type AomiOAuthTokenRequest = {
    resource: AomiOAuthResource;
    scopes: readonly string[];
    forceRefresh?: boolean;
};
type AomiOAuthTokenProvider = (request: AomiOAuthTokenRequest) => Promise<AomiOAuthTokenSet | null>;
declare function createOAuthTokenProvider(input: {
    initial?: AomiOAuthTokenSet | null;
    refresh: (current: AomiOAuthTokenSet, request: AomiOAuthTokenRequest) => Promise<AomiOAuthTokenSet>;
    now?: () => number;
}): AomiOAuthTokenProvider & {
    clear(): void;
    current(): AomiOAuthTokenSet | null;
};
type AuthorizationPoster = <T>(path: string, body: unknown) => Promise<T>;
type AomiAuthorizationPermit = {
    account: string;
    chain_type: string;
    wallet: string;
    mode: string;
    version: number;
    expiry: number;
};
type AomiAuthorizationChallenge = {
    permit: AomiAuthorizationPermit;
    typed_data?: unknown;
    message_base64?: string;
};
type AomiAuthorizationState = {
    address: string;
    chain_type: string;
    signing_mode: string;
    authorization_version: number;
};
type AomiEnsureBoundResult = {
    status: "bound";
    state: AomiAuthorizationState;
} | {
    status: "already_bound";
};
declare function posterFromClient(client: AomiClient): AuthorizationPoster;
declare function authorizationChallenge(post: AuthorizationPoster, request: {
    chain_type: string;
    wallet: string;
    mode: string;
}): Promise<AomiAuthorizationChallenge>;
declare function authorizationCommit(post: AuthorizationPoster, request: {
    permit: AomiAuthorizationPermit;
    signature: string;
    signer?: string;
}): Promise<AomiAuthorizationState>;
declare function ensureSvmWalletBoundVia(post: AuthorizationPoster, wallet: string, signMessage: (message: Uint8Array) => Promise<Uint8Array>): Promise<AomiEnsureBoundResult>;
declare function ensureSvmWalletBound(client: AomiClient, wallet: string, signMessage: (message: Uint8Array) => Promise<Uint8Array>): Promise<AomiEnsureBoundResult>;
declare function isUnboundWalletError(error: unknown): boolean;

type GuestSessionProvider = ((options?: {
    forceRefresh?: boolean;
}) => Promise<string>) & {
    clear(): void;
};
declare function createGuestSessionProvider(input: {
    baseUrl: string;
    fetch?: typeof fetch;
}): GuestSessionProvider;

/**
 * Optional logger for debug output. Pass `console` or any compatible object.
 */
type Logger = {
    debug: (...args: unknown[]) => void;
};
type AomiClientOptions = {
    /** Base URL of the Aomi backend (e.g. "https://api.aomi.dev" or "/" for same-origin proxying) */
    baseUrl: string;
    /** Optional fetch implementation for payment-aware browser transports and tests. */
    fetch?: typeof fetch;
    /** Default API key for non-default apps */
    apiKey?: string;
    /** Supplies a short-lived Aomi account bearer for REST and SSE requests. */
    getAccountBearer?: GetAccountBearer;
    /** Resource-bound developer OAuth. Takes precedence over session/guest auth. */
    oauth?: AomiOAuthTokenProvider;
    /** Low-friction Better Auth anonymous session for `/v1` calls. Defaults on. */
    guest?: boolean | GuestSessionProvider;
    /** Optional logger for debug output (default: silent) */
    logger?: Logger;
};
type GetAccountBearer = ((options?: {
    /** Force a refresh after an API 401. */
    forceRefresh?: boolean;
}) => Promise<string | null | undefined>) & {
    /**
     * When true, a throwing bearer source is fatal: the wrapped fetch rethrows
     * instead of proceeding unauthenticated. Providers that mint a required
     * (widget) session set this; additive account bearers leave it unset.
     */
    required?: boolean;
    /**
     * Notifies consumers when the bearer rotates or is revoked. AomiClient uses
     * this to reconnect live SSE streams with the new credential.
     *
     * The property is optional because API-key and cookie-backed integrations do
     * not own a refreshable account bearer. WidgetSessionProvider always exposes
     * it. Wrappers around a widget provider must preserve this subscription or
     * provide their own stable forwarding subscription.
     */
    subscribe?: (listener: () => void) => () => void;
};
type AomiRequestQueryValue = string | number | boolean | readonly (string | number | boolean)[] | null | undefined;
type AomiPlatformFilter = string | readonly string[] | null | undefined;
/** Stable id of a hosted app; null/empty means "not app-scoped". */
type ApplicationId = number | string | null;
type AomiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
interface AomiRequestOptions {
    /** Thread id for thread-scoped routes. Kept as sessionId for SDK compatibility. */
    sessionId?: string;
    /** App key for app-key checked routes; defaults to the client's apiKey. */
    apiKey?: string;
    /** Query params appended to the request URL. */
    query?: Record<string, AomiRequestQueryValue>;
    /** JSON request payload. */
    body?: unknown;
    /** Extra request headers. */
    headers?: HeadersInit;
    /** Use the native fetch path instead of a custom payment-aware fetch wrapper. */
    raw?: boolean;
}
interface AomiMessage {
    /** Stable public Agent message identity when available. */
    id?: string;
    /**
     * `notice` is a durable runtime record — today, a turn the provider refused.
     * Unlike `system`, which the projection drops, a notice is shown to the user
     * and survives a reload.
     */
    sender?: "user" | "agent" | "system" | "notice" | string;
    /**
     * Backend-allocated identity for this message, stable across polls and
     * reloads. Absent on legacy rows the runtime hydrated without one.
     *
     * The only sound id for a rendered notice: every failure notice carries the
     * same copy, so anything derived from content collides across distinct
     * failures in one thread.
     */
    message_key?: string;
    content?: string;
    timestamp?: string;
    is_streaming?: boolean;
    tool_result?: [string, string] | null;
    /** Name of the tool this message reports on, when the backend supplies it. */
    tool_name?: string;
    /** Arguments the model passed to `tool_name`, as serialized by the backend. */
    tool_arguments?: unknown;
}
/**
 * GET /api/thread/state
 * Fetches current session state including messages and processing status
 */
interface AomiStateResponse {
    messages?: AomiMessage[] | null;
    system_events?: AomiSystemEvent[] | null;
    title?: string | null;
    is_processing?: boolean;
    user_state?: UserState | null;
}
/**
 * POST /api/thread/chat
 * Sends a chat message and returns updated session state
 */
interface AomiChatResponse {
    messages?: AomiMessage[] | null;
    system_events?: AomiSystemEvent[] | null;
    title?: string | null;
    is_processing?: boolean;
    user_state?: UserState | null;
    /** @deprecated Retained for compatibility with backends that return turn correlation metadata. */
    turn_id?: string | null;
}
/**
 * POST /api/system
 * Sends a system message and returns the response message
 */
interface AomiSystemResponse {
    res?: AomiMessage | null;
}
/**
 * POST /api/exec/simulate
 * Batch-simulate pending transactions atomically (snapshot → sequential send → revert).
 */
interface AomiSimulateFee {
    /** Treasury address to receive the fee. */
    recipient: string;
    /** Fee amount in wei (decimal string). */
    amount_wei: string;
    /** Token type — always "native" for now. */
    token: "native";
}
interface AomiSimulateResponse {
    result: {
        batch_success: boolean;
        stateful: boolean;
        from: string;
        network: string;
        total_gas?: number;
        fee?: AomiSimulateFee;
        steps: Array<{
            step: number;
            label: string;
            success: boolean;
            result?: string | null;
            revert_reason?: string | null;
            gas_used?: number;
            tx: {
                to: string;
                value_wei: string;
                value_eth: string;
                data: string;
            };
        }>;
    };
}
/**
 * POST /api/thread/interrupt
 * Interrupts current processing and returns updated session state
 */
type AomiInterruptResponse = AomiChatResponse;
/**
 * GET /api/threads
 * Returns array of AomiThread
 */
interface AomiThread {
    thread_id?: string;
    session_id: string;
    title: string | null;
    is_archived?: boolean;
    last_active_at?: number;
}
type AomiAccountResponse = AomiAccountProfile;
/**
 * POST /api/threads
 * Creates a new thread/session
 */
interface AomiCreateThreadResponse {
    thread_id?: string;
    session_id: string;
    title?: string | null;
    /** Bound rig slug — present only when the create carried `rig` (fast path). */
    rig?: string;
    /** Bound baml client — present only on the create fast path. */
    baml?: string;
}
/**
 * GET /api/account
 * The account bound to the authenticated request (resolved from the account
 * bearer). Returned only when the session is bound to a real user; an
 * anonymous session yields HTTP 400.
 */
interface AomiUser {
    user_id: string;
    username?: string | null;
    apps?: string[];
    tier?: string;
    verified_email?: string | null;
    status?: string;
    last_seen_at?: number | null;
    created_at?: number;
    updated_at?: number;
}
interface AomiAuthIdentity {
    id: number;
    application?: string | null;
    wallet_provider: string;
    auth_method: string;
    auth_verified_at?: number | null;
    is_primary: boolean;
    created_at: number;
}
interface AomiIdentityWallet {
    wallet_id?: string | null;
    address: string;
    chain_type: string;
    wallet_provider: string;
}
interface AomiUsageStats {
    period_utc_month?: string;
    input_tokens: number;
    output_tokens: number;
    credit_used: number;
    credit_paid: number;
}
interface AomiAccountProfile {
    user: AomiUser;
    auth_identities?: AomiAuthIdentity[];
    identity_wallets?: AomiIdentityWallet[];
    usage?: AomiUsageStats;
}
interface AomiCreateApprovalRequest {
    auth_identity_id: number;
    grant_kind: string;
    secret_handle: string;
    external_subject?: string | null;
    display_label?: string | null;
    scopes?: string[];
    expires_at?: number | null;
    metadata?: unknown;
}
interface AomiAccessApproval {
    id: number;
    user_id: string;
    auth_identity_id: number;
    external_subject?: string | null;
    display_label?: string | null;
    grant_kind: string;
    scopes: string[];
    secret_handle: string;
    expires_at?: number | null;
    granted_at: number;
    revoked_at?: number | null;
    metadata: unknown;
    created_at: number;
    updated_at: number;
}
interface AomiBeginAccountAuthResponse {
    state_token: string;
    auth_url: string;
    expires_at: number;
}
type AomiWalletFamily = "evm" | "svm";
type AomiAuthWalletFamily = "evm" | "solana";
/** Provider login intent. Linking ownership never implies delegated signing. */
type AomiAuthPurpose = "link_wallet" | "delegate_signing";
/**
 * GET/POST/DELETE /api/account/payment/byok
 * Lists or saves BYOK keys (one per LLM provider) for the account.
 */
interface AomiByokKeyEntry {
    provider: string;
    key_prefix: string;
    label?: string | null;
    is_active: boolean;
}
/**
 * Base SSE event. Newer backends may include `thread_id`; `session_id` stays
 * optional for SDK compatibility with existing consumers.
 */
type AomiSSEEvent = {
    type: "title_changed" | "tool_update" | "tool_complete" | "system_notice" | "task_started" | "task_activity" | "task_completed" | string;
    session_id?: string;
    thread_id?: string;
    new_title?: string;
    [key: string]: unknown;
};
/** Terminal status reported by `task_completed`. */
type AomiTaskStatus = "completed" | "failed" | "stalled" | "cancelled" | string;
/** Child step flavor reported by `task_activity`. */
type AomiTaskActivityKind = "tool_call" | "note";
/** Emitted when the mother dispatches a `task` call, before awaiting the child. */
type AomiTaskStartedEvent = {
    type: "task_started";
    /** id of the mother's `task` tool call. */
    call_id: string;
    /** Stable child handle, e.g. `task-agent:9f2c…`. */
    agent_id: string;
    label: string;
    app?: string | null;
    resumed?: boolean;
    session_id?: string;
    thread_id?: string;
};
/** Emitted as the mother observes the child transcript grow. */
type AomiTaskActivityEvent = {
    type: "task_activity";
    call_id: string;
    agent_id: string;
    kind: AomiTaskActivityKind;
    /** Present for `kind: "tool_call"`. */
    tool_name?: string;
    /** Present for `kind: "tool_call"`; redacted/truncated by the backend. */
    args?: unknown;
    /** Present for `kind: "tool_call"`; redacted/truncated by the backend. */
    result_preview?: string;
    /** Present for `kind: "note"`. */
    text?: string;
    /** Monotonic per agent — used for ordering and replay dedupe. */
    child_seq: number;
    session_id?: string;
    thread_id?: string;
};
/** Emitted just before the mother's `task` call returns. */
type AomiTaskCompletedEvent = {
    type: "task_completed";
    call_id: string;
    agent_id: string;
    status: AomiTaskStatus;
    message?: string;
    staged_count?: number;
    /** Number of child steps the backend counted (may exceed observed activity). */
    steps?: number;
    duration_ms?: number;
    session_id?: string;
    thread_id?: string;
};
type AomiTaskEvent = AomiTaskStartedEvent | AomiTaskActivityEvent | AomiTaskCompletedEvent;
type AomiTaskEventType = AomiTaskEvent["type"];
declare const AOMI_TASK_EVENT_TYPES: readonly ["task_started", "task_activity", "task_completed"];
declare function isAomiTaskEventType(type: string): type is AomiTaskEventType;
/**
 * Narrow a raw SSE payload to a typed task event.
 *
 * Returns `null` when the payload is not a task event or is missing the fields
 * the UI joins on (`agent_id`, plus `child_seq` for activity), so a malformed
 * backend event degrades to "no row" instead of a half-built one.
 */
declare function parseAomiTaskEvent(event: AomiSSEEvent | AomiTaskEvent): AomiTaskEvent | null;
/**
 * POST /api/secrets
 * Ingests secrets for a client, returns opaque handles
 */
interface AomiIngestSecretsResponse {
    handles: Record<string, string>;
}
/**
 * DELETE /api/secrets
 * Clears all secrets for a client
 */
interface AomiClearSecretsResponse {
    cleared: boolean;
}
/**
 * DELETE /api/secrets/:name
 * Removes a single secret for a client
 */
interface AomiDeleteSecretResponse {
    deleted: boolean;
}
/**
 * GET /api/secrets
 * Per-app slot names currently filled for the session's client. The
 * backend never returns raw values; only the names.
 */
interface AomiListSecretsResponse {
    /** Client-scoped handle names (`BYOK:*`, `PAYMENT:*`). */
    names?: string[];
    /**
     * Retired. Per-user app-scoped secrets no longer exist — an application's
     * Environment belongs to its Builder. A backend that predates that change
     * still answers with this shape, and the one that follows it sends an empty
     * object for a release so pre-deploy browser tabs do not throw, so keep
     * reading it until every deployed backend is past the cutover.
     */
    by_app?: Record<string, string[]>;
}
/**
 * One per-app secret slot declared by a plugin manifest. Surfaced via
 * `AomiAppDescriptor.secrets` so the frontend can render input rows and
 * gate app load on `required` slots being filled.
 */
interface AomiSecretSlot {
    name: string;
    description: string;
    required: boolean;
}
/**
 * GET /api/thread/apps
 * One entry per app the user can use. `secrets` is empty for apps that
 * declare no slots.
 */
interface AomiAppDescriptor {
    name: string;
    applicationId?: number | string | null;
    platform?: string | null;
    label?: string | null;
    appReleaseTag?: string | null;
    isActive?: boolean | null;
    isPublic?: boolean | null;
    artifactReady?: boolean | null;
    secrets?: AomiSecretSlot[];
}
type AomiSSEEventType = "title_changed" | "tool_update" | "tool_complete" | "system_notice" | AomiTaskEventType;
/**
 * Backend SystemEvent enum serializes as tagged JSON:
 * - InlineCall: {"InlineCall": {"type": "wallet_tx_request", "payload": {...}}}
 * - SystemNotice: {"SystemNotice": "message"}
 * - SystemError: {"SystemError": "message"}
 * - AsyncCallback: {"AsyncCallback": {...}} (not sent over HTTP)
 */
type AomiSystemEvent = {
    InlineCall: {
        type: string;
        payload?: unknown;
        [key: string]: unknown;
    };
} | {
    SystemNotice: string;
} | {
    SystemError: string;
} | {
    AsyncCallback: Record<string, unknown>;
};
declare function isInlineCall(event: AomiSystemEvent): event is {
    InlineCall: {
        type: string;
        payload?: unknown;
    };
};
declare function isSystemNotice(event: AomiSystemEvent): event is {
    SystemNotice: string;
};
declare function isSystemError(event: AomiSystemEvent): event is {
    SystemError: string;
};
declare function isAsyncCallback(event: AomiSystemEvent): event is {
    AsyncCallback: Record<string, unknown>;
};

interface components {
    schemas: {
        ActionResult: {
            legs: {
                id: string;
                reason?: string;
                signedTransactionBase64?: string;
                /** @enum {unknown} */
                status: "submitted" | "rejected" | "failed" | "skipped";
                transactionId?: string;
            }[];
            revision: number;
            /** @constant */
            status: "submitted";
        } | {
            outputs: {
                id: string;
                signature?: string;
                signedTransactionBase64?: string;
            }[];
            revision: number;
            /** @constant */
            status: "signed";
        } | {
            reason: string;
            revision: number;
            /** @constant */
            status: "rejected";
        };
        AgentAction: components["schemas"]["EvmExternalTransactionAction"] | components["schemas"]["SvmExternalTransactionAction"] | components["schemas"]["SigningRequestAction"];
        AgentActionBase: {
            contextGeneration: number;
            /** Format: date-time */
            createdAt: string;
            description: string;
            /** Format: date-time */
            expiresAt: string | null;
            generation: number;
            id: string;
            revision: number;
            /** @enum {string} */
            status: "pending" | "signed" | "submitted" | "finalized" | "rejected" | "failed" | "expired" | "superseded";
        };
        AgentActivity: {
            /** @enum {string} */
            type: "tool_complete" | "task_started" | "task_activity" | "task_completed";
        } & {
            [key: string]: unknown;
        };
        AgentDelta: {
            actions: components["schemas"]["AgentAction"][];
            activity: components["schemas"]["AgentActivity"][];
            cursor: string;
            hasMore: boolean;
            messages: components["schemas"]["AgentMessage"][];
            sessionId: string;
            /** @enum {string} */
            status: "processing" | "awaiting_user" | "complete" | "interrupted" | "failed";
            title?: string | null;
        };
        AgentMessage: {
            content: string;
            createdAt: string;
            id: string;
            /** @enum {string} */
            role: "user" | "agent" | "system";
            streaming: boolean;
            toolArguments?: unknown;
            toolName?: string;
            toolResult?: [string, string];
        };
        AgentSession: {
            archived: boolean;
            id: string;
            title?: string | null;
            updatedAt: number;
        };
        ErrorEnvelope: {
            error: {
                code: string;
                details?: unknown;
                message: string;
                requestId?: string;
            };
        };
        EvmExternalTransactionAction: components["schemas"]["AgentActionBase"] & {
            /** @constant */
            broadcaster: "wallet";
            /** @constant */
            chainFamily: "evm";
            chainId: number;
            /** @constant */
            executionKind: "eoa";
            signer: string;
            transactions: components["schemas"]["EvmTransactionIntent"][];
            /** @constant */
            type: "external_transaction";
        };
        EvmTransactionIntent: {
            accessList: unknown[];
            data: string;
            description: string;
            from: string;
            gas: string | null;
            gasPrice: string | null;
            id: string;
            intentHash: string;
            maxFeePerGas: string | null;
            maxPriorityFeePerGas: string | null;
            nonce: string | null;
            simulation: {
                error: string | null;
                gasUsed: string | null;
                success: boolean;
            };
            to: string;
            transactionType: string | null;
            value: string;
        };
        EvmWallet: {
            address: string;
            chainId?: number;
        };
        PipelineAction: {
            action_id: string;
            action_type: string;
            created_at: number;
            expires_at: number;
            payload: unknown;
            payload_hash: string;
            result?: unknown;
            revision: number;
            schema_version: number;
            status: string;
            updated_at: number;
        };
        PipelineAppCard: {
            app_instructions_available?: boolean;
            app_release_tag?: string | null;
            application_id?: number | null;
            artifact_ready?: boolean | null;
            chain?: string;
            match_reasons?: string[];
            name: string;
            namespaces: string[];
            next_step?: string;
            platform?: string | null;
            score?: number;
            selected?: boolean;
            tool_count: number;
        } & {
            [key: string]: unknown;
        };
        PipelineAppDescription: {
            app: string;
            app_instructions: {
                [key: string]: unknown;
            };
            app_release_tag?: string | null;
            application_id?: number | null;
            artifact_ready?: boolean | null;
            namespace_catalog: {
                [key: string]: unknown;
            };
            platform?: string | null;
            tool_count: number;
        };
        PipelineAppList: {
            apps: components["schemas"]["PipelineAppCard"][];
            returned: number;
        };
        PipelineCommand: {
            /** @enum {string} */
            kind: "tool_call" | "silent_tool_call" | "system_notice" | "error";
            message?: string;
            result?: unknown;
            topic?: string;
        };
        PipelineRunRequest: {
            app: string;
            applicationId?: number | null;
            plan?: {
                [key: string]: unknown;
            };
            platform?: string | null;
            program?: string;
            sessionId: string;
            /** @default [] */
            skills: string[];
        } & (unknown | unknown);
        PipelineRunResponse: {
            actions?: components["schemas"]["PipelineAction"][];
            app: string;
            error?: string;
            followups?: {
                [key: string]: unknown;
            }[];
            steps: components["schemas"]["PipelineRunStep"][];
            thread_id: string;
            value: unknown;
        };
        PipelineRunStep: {
            error?: string | null;
            ok: boolean;
            tool: string;
        } & {
            [key: string]: unknown;
        };
        PipelineSearchResults: {
            app?: string | null;
            app_release_tag?: string | null;
            application_id?: number | null;
            artifact_ready?: boolean | null;
            next_step?: string;
            platform?: string | null;
            query: string;
            results: {
                [key: string]: unknown;
            }[];
            returned: number;
            total: number;
        } & {
            [key: string]: unknown;
        };
        PipelineSkill: {
            description?: string;
            id: string;
            instructions?: string;
            name: string;
            tool_names?: string[];
        } & {
            [key: string]: unknown;
        };
        PipelineSkillList: {
            next_step?: string;
            returned: number;
            skills: components["schemas"]["PipelineSkill"][];
        };
        PipelineTool: {
            description: string;
            execution?: {
                [key: string]: unknown;
            };
            input_schema?: {
                [key: string]: unknown;
            };
            name: string;
            namespaces: string[];
            requires_skill?: string | null;
            supports_async: boolean;
        } & {
            [key: string]: unknown;
        };
        PipelineToolCallRequest: {
            app: string;
            applicationId?: number | null;
            /** @default {} */
            arguments: {
                [key: string]: unknown;
            };
            platform?: string | null;
            sessionId: string;
            /** @default [] */
            skills: string[];
            toolId: string;
        };
        PipelineToolCallResponse: {
            actions?: components["schemas"]["PipelineAction"][];
            app: string;
            commands: components["schemas"]["PipelineCommand"][];
            followup: unknown;
            thread_id: string;
        };
        PipelineToolDescription: {
            app: string;
            application_id?: number | null;
            platform?: string | null;
            skill_instructions: components["schemas"]["PipelineSkill"] | null;
            tool: components["schemas"]["PipelineTool"];
        };
        PipelineToolList: {
            app: string;
            app_release_tag?: string | null;
            application_id?: number | null;
            artifact_ready?: boolean | null;
            namespace?: string | null;
            platform?: string | null;
            returned: number;
            schemas_included?: boolean;
            tools: components["schemas"]["PipelineTool"][];
            total: number;
        } & {
            [key: string]: unknown;
        };
        SessionPage: {
            nextCursor?: string | null;
            sessions: components["schemas"]["AgentSession"][];
        };
        SignablePayload: {
            digest: string;
            id: string;
            /** @constant */
            kind: "evm_personal";
            message: string;
        } | {
            digest: string;
            id: string;
            /** @constant */
            kind: "evm_typed_data";
            typedData: {
                [key: string]: unknown;
            };
        } | {
            digest: string;
            id: string;
            /** @constant */
            kind: "svm_message";
            messageBase64: string;
        } | {
            digest: string;
            id: string;
            /** @constant */
            kind: "svm_transaction";
            transactionBase64: string;
        };
        SigningCall: {
            data?: string;
            to: string;
            value: string;
        };
        SigningFee: {
            amount: string;
            asset: {
                address?: string;
                /** @enum {string} */
                kind: "native" | "token";
            };
            recipient: string;
        };
        SigningRequestAction: components["schemas"]["AgentActionBase"] & {
            /** @enum {string} */
            broadcaster: "wallet" | "venue" | "backend";
            calls: components["schemas"]["SigningCall"][];
            callsDigest: string | null;
            /** @enum {string} */
            chainFamily: "evm" | "svm";
            chainId: number | null;
            cluster: string | null;
            /** @enum {string} */
            executionKind: "message" | "transaction" | "account_abstraction" | "hosted";
            executor: string | null;
            fees: components["schemas"]["SigningFee"][];
            operationId: string | null;
            payloads: components["schemas"]["SignablePayload"][];
            signer: string;
            /** @enum {string|null} */
            sponsorship: "required" | null;
            /** @constant */
            type: "signing_request";
        };
        StartTurnRequest: {
            app?: string | null;
            applicationId?: number | null;
            message: string;
            model?: string | null;
            sessionId?: string | null;
            wallets?: components["schemas"]["WalletContext"] | null;
        };
        SvmExternalTransactionAction: components["schemas"]["AgentActionBase"] & {
            /** @constant */
            broadcaster: "wallet";
            /** @constant */
            chainFamily: "svm";
            cluster: string;
            /** @constant */
            executionKind: "wallet";
            signer: string;
            transactions: components["schemas"]["SvmTransactionIntent"][];
            /** @constant */
            type: "external_transaction";
        };
        SvmTransactionIntent: {
            description: string;
            id: string;
            intentHash: string;
            lastValidBlockHeight: number | null;
            preserveBlockhash: boolean;
            recentBlockhash: string;
            unsignedTransactionBase64: string;
        };
        SvmWallet: {
            address: string;
            cluster?: string;
        };
        UpdateSessionRequest: {
            archived?: boolean | null;
            title?: string | null;
        };
        WalletContext: {
            evm?: components["schemas"]["EvmWallet"];
            svm?: components["schemas"]["SvmWallet"];
        };
    };
    responses: {
        /** @description Stable public error */
        Error: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
    };
    parameters: {
        ActionId: string;
        PipelineApp: string;
        PipelineSkillId: string;
        PipelineToolId: string;
        SessionId: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}

type Schemas$1 = components["schemas"];
type AgentStatus = Schemas$1["AgentDelta"]["status"];
type AgentMessage = Schemas$1["AgentMessage"];
type AgentActivity = Schemas$1["AgentActivity"];
type EvmExternalTransactionAction = Schemas$1["EvmExternalTransactionAction"];
type SvmExternalTransactionAction = Schemas$1["SvmExternalTransactionAction"];
type SigningRequestAction = Schemas$1["SigningRequestAction"];
type AgentAction = Schemas$1["AgentAction"];
type AgentDelta = Schemas$1["AgentDelta"];
type AgentWalletContext = Schemas$1["WalletContext"];
type AgentStartRequest = Schemas$1["StartTurnRequest"];
type AgentActionResult = Schemas$1["ActionResult"];
type AgentSessionRecord = Schemas$1["AgentSession"];
type AgentSessionPage = Schemas$1["SessionPage"];

type RequestResponse$1 = (method: AomiHttpMethod, path: string, options?: AomiRequestOptions) => Promise<Response>;
declare class AgentApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly retryable: boolean;
    readonly requestId?: string | undefined;
    readonly details?: unknown | undefined;
    constructor(status: number, code: string, message: string, retryable: boolean, requestId?: string | undefined, details?: unknown | undefined);
}
/** The single typed transport for every first-party Agent consumer. */
declare class AgentTransport {
    private readonly requestResponse;
    readonly sessions: AgentSessionsTransport;
    constructor(requestResponse: RequestResponse$1);
    start(request: AgentStartRequest, options?: {
        idempotencyKey?: string;
        paymentSignature?: string;
    }): Promise<AgentDelta>;
    check(sessionId: string, options?: {
        cursor?: string;
        waitMs?: number;
    }): Promise<AgentDelta>;
    interrupt(sessionId: string): Promise<AgentDelta>;
    resolveAction(sessionId: string, actionId: string, result: AgentActionResult, idempotencyKey?: string): Promise<AgentAction>;
    private json;
}
declare class AgentSessionsTransport {
    private readonly requestResponse;
    constructor(requestResponse: RequestResponse$1);
    list(options?: {
        cursor?: string;
        limit?: number;
    }): Promise<AgentSessionPage>;
    get(sessionId: string): Promise<AgentSessionRecord>;
    update(sessionId: string, patch: {
        title?: string;
        archived?: boolean;
    }): Promise<AgentSessionRecord>;
    delete(sessionId: string): Promise<void>;
    private json;
}

type Schemas = components["schemas"];
type PipelineCatalogResponse = Schemas["PipelineAppList"] | Schemas["PipelineAppDescription"] | Schemas["PipelineToolList"] | Schemas["PipelineToolDescription"] | Schemas["PipelineSkillList"] | Schemas["PipelineSkill"] | Schemas["PipelineSearchResults"];
type PipelineExecutionResponse = Schemas["PipelineToolCallResponse"] | Schemas["PipelineRunResponse"];
type PipelineAction = Schemas["PipelineAction"];
type PipelineResource = Record<string, unknown>;
interface PipelineListOptions {
    /** Result limit, bounded by the selected catalog operation. */
    limit?: number;
}
interface PipelineToolListOptions extends PipelineListOptions {
    app?: string;
    namespace?: string;
}
interface PipelineSearchOptions extends PipelineListOptions {
    q?: string;
}
interface PipelineToolSearchOptions extends PipelineSearchOptions {
    app?: string;
}
/**
 * Headers that bind one fail-closed, at-most-once Pipeline execution.
 *
 * The transport deliberately does not manufacture this key: callers must
 * retain and reuse it for the same logical operation. An unknown post-effect
 * crash may remain permanently pending; the client does not retry or claim
 * recovery for that outcome.
 */
interface PipelineExecutionOptions {
    idempotencyKey: string;
    paymentSignature?: string;
}
type PipelineAppsResponse = Schemas["PipelineAppList"];
type PipelineAppResponse = Schemas["PipelineAppDescription"];
type PipelineToolsResponse = Schemas["PipelineToolList"];
type PipelineToolResponse = Schemas["PipelineToolDescription"];
type PipelineSkillsResponse = Schemas["PipelineSkillList"];
type PipelineSearchResponse = Schemas["PipelineSearchResults"];
type GeneratedPipelineToolCallRequest = Schemas["PipelineToolCallRequest"];
/** Public execution context resolved and enforced by the backend runtime. */
type PipelineToolCallRequest = Omit<GeneratedPipelineToolCallRequest, "skills"> & {
    skills?: string[];
};
type GeneratedPipelineRunRequest = Schemas["PipelineRunRequest"];
type PipelineRunRequestBase = Omit<GeneratedPipelineRunRequest, "program" | "plan" | "skills"> & {
    skills?: string[];
};
/** The server requires exactly one frozen program representation. */
type PipelineRunRequest = PipelineRunRequestBase & ({
    program: string;
    plan?: never;
} | {
    program?: never;
    plan: Record<string, unknown>;
});

type RequestResponse = (method: AomiHttpMethod, path: string, options?: AomiRequestOptions) => Promise<Response>;
declare class PipelineApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly retryable: boolean;
    readonly requestId?: string | undefined;
    readonly details?: unknown | undefined;
    constructor(status: number, code: string, message: string, retryable: boolean, requestId?: string | undefined, details?: unknown | undefined);
}
/** The single typed transport for every first-party Pipeline consumer. */
declare class PipelineTransport {
    private readonly requestResponse;
    constructor(requestResponse: RequestResponse);
    listApps(options?: PipelineListOptions): Promise<PipelineAppsResponse>;
    getApp(app: string): Promise<PipelineAppResponse>;
    searchApps(options?: PipelineSearchOptions): Promise<PipelineSearchResponse>;
    listTools(options?: PipelineToolListOptions): Promise<PipelineToolsResponse>;
    getTool(toolId: string, options?: {
        app?: string;
    }): Promise<PipelineToolResponse>;
    searchTools(options?: PipelineToolSearchOptions): Promise<PipelineSearchResponse>;
    listSkills(options?: PipelineListOptions): Promise<PipelineSkillsResponse>;
    getSkill(skillId: string): Promise<PipelineCatalogResponse>;
    callTool<T extends PipelineExecutionResponse = PipelineExecutionResponse>(request: PipelineToolCallRequest, options: PipelineExecutionOptions): Promise<T>;
    run<T extends PipelineExecutionResponse = PipelineExecutionResponse>(request: PipelineRunRequest, options: PipelineExecutionOptions): Promise<T>;
    private json;
}

/**
 * Read secret names out of a {@link AomiListSecretsResponse} whichever shape
 * the backend sent.
 *
 * A backend from before per-user app secrets were retired answers
 * `{ by_app: { <app>: [names] } }`; the one after answers `{ names: [...] }`
 * (plus an empty `by_app` for one release). This client ships ahead of the
 * backend, so it has to read both — and a browser tab cached across the
 * cutover will hit each of them in turn.
 */
declare function secretNamesFrom(response: AomiListSecretsResponse): string[];
declare class AomiClient {
    readonly agent: AgentTransport;
    readonly pipeline: PipelineTransport;
    private readonly baseUrl;
    private readonly apiKey?;
    private readonly fetchImpl;
    private readonly rawFetchImpl;
    private readonly logger?;
    private readonly accountBearer?;
    private readonly sseSubscriber;
    constructor(options: AomiClientOptions);
    /**
     * Attach the token-refresh -> SSE-reconnect wiring, idempotently.
     *
     * Historically evaluated ONCE in the constructor, which silently dropped
     * reconnect for a stable bearer whose `subscribe` appears after construction.
     * Re-attempted lazily on every SSE subscription so that shape is picked up on
     * the next stream instead of never. Replacing the bearer function itself still
     * requires a stable host/widget bridge; AomiClient intentionally retains the
     * source supplied at construction.
     */
    private tokenRefreshWired;
    private wireTokenRefreshReconnect;
    /**
     * Low-level request escape hatch for the full backend route manifest.
     * Prefer the typed helpers below for common chat/session/account flows.
     */
    request<T = unknown>(method: AomiHttpMethod, path: string, options?: AomiRequestOptions): Promise<T>;
    /** Raw authenticated response transport shared by JSON, SSE, and MCP clients. */
    requestResponse(method: AomiHttpMethod, path: string, options?: AomiRequestOptions): Promise<Response>;
    /**
     * Fetch current session state (messages, processing status, title).
     */
    fetchState(sessionId: string, userState?: OwnedUserState, clientId?: string, options?: {
        app?: string;
        applicationId?: ApplicationId;
    }): Promise<AomiStateResponse>;
    /**
     * Send a chat message and return updated session state.
     */
    sendMessage(sessionId: string, message: string, options?: {
        app?: string;
        applicationId?: ApplicationId;
        apiKey?: string;
        userState?: OwnedUserState;
        clientId?: string;
        paymentMethod?: string | null;
        /** @deprecated Accepted as a no-op for compatibility with client 0.4.3. */
        turnId?: string;
    }): Promise<AomiChatResponse>;
    /**
     * Send a system-level message (e.g. wallet state changes, context switches).
     * Pass `app` to preserve the session's active app context (prevents the
     * backend from resetting to the default app when no app is specified).
     */
    sendSystemMessage(sessionId: string, message: string, options?: {
        app?: string;
        applicationId?: ApplicationId;
    }): Promise<AomiSystemResponse>;
    /**
     * Interrupt the AI's current response.
     */
    interrupt(sessionId: string, options?: {
        app?: string;
        applicationId?: ApplicationId;
    }): Promise<AomiInterruptResponse>;
    /**
     * Ingest client-scoped secrets. Returns opaque `$SECRET:<name>` handles.
     *
     * There is no app scope. A hosted app's Environment belongs to its Builder
     * and is configured in Aomi Build; a per-user copy of it was a second,
     * process-local store that answered the same handle differently depending on
     * which fleet host served the turn. The backend answers 410 to any request
     * that still carries one.
     */
    ingestSecrets(sessionId: string, clientId: string, secrets: Record<string, string>): Promise<AomiIngestSecretsResponse>;
    /** Clear every client-scoped secret and unbind the session. */
    clearSecrets(sessionId: string, clientId: string): Promise<AomiClearSecretsResponse>;
    /** Remove a single named client-scoped secret. */
    deleteSecret(sessionId: string, clientId: string, name: string): Promise<AomiDeleteSecretResponse>;
    /**
     * List the stored secret NAMES for this client — never values.
     *
     * Read the result with {@link secretNamesFrom}, which tolerates the
     * pre-cutover `by_app` shape as well as the flat `names` list.
     */
    listSecrets(sessionId: string, clientId?: string): Promise<AomiListSecretsResponse>;
    /**
     * Subscribe to real-time SSE updates for a session.
     * Automatically reconnects with exponential backoff on disconnects.
     * Returns an unsubscribe function.
     */
    subscribeSSE(sessionId: string, onUpdate: (event: AomiSSEEvent) => void, onError?: (error: unknown) => void, options?: {
        applicationId?: ApplicationId;
    }): () => void;
    /**
     * @deprecated Account bootstrap is handled by session create/chat requests and
     * the account-token exchange. `/api/account` is now an authenticated
     * profile endpoint, so this legacy helper intentionally does nothing.
     */
    ensureAccount(_sessionId: string, _publicKey: string): Promise<void>;
    /**
     * List all threads for the authenticated account.
     */
    listThreads(sessionId: string): Promise<AomiThread[]>;
    /**
     * Get a single thread by ID.
     */
    getThread(sessionId: string): Promise<AomiThread>;
    /**
     * Create a new thread. The client generates the session ID.
     *
     * Passing `rig` (and optionally `app`/`applicationId`/`platform`/`clientId`)
     * binds the model selection in the same request — the fast path that saves
     * the follow-up `setModel` round-trip on a fresh chat.
     */
    createThread(threadId: string, options?: {
        rig?: string;
        app?: string;
        applicationId?: number | string;
        platform?: string;
        clientId?: string;
    }): Promise<AomiCreateThreadResponse>;
    /**
     * Delete a thread by ID.
     */
    deleteThread(sessionId: string): Promise<void>;
    /**
     * Rename a thread.
     */
    renameThread(sessionId: string, newTitle: string): Promise<void>;
    /**
     * Archive a thread.
     */
    archiveThread(sessionId: string): Promise<void>;
    /**
     * Unarchive a thread.
     */
    unarchiveThread(sessionId: string): Promise<void>;
    /**
     * Get system events for a session.
     */
    getSystemEvents(sessionId: string, count?: number, options?: {
        applicationId?: ApplicationId;
    }): Promise<AomiSystemEvent[]>;
    /**
     * Get available apps as full descriptors (name + declared secret slots).
     * The settings page consumes the slot info to render per-app inputs and
     * the chat shell uses it to gate app load when required slots are unfilled.
     */
    getApps(sessionId: string, options?: {
        apiKey?: string;
        platforms?: AomiPlatformFilter;
        applicationId?: ApplicationId;
    }): Promise<AomiAppDescriptor[]>;
    /**
     * Fetch the account bound to the authenticated request (resolved from the
     * account bearer). Returns `null` when the session is not bound to a real
     * user — the backend answers `/api/account` with HTTP 400 for
     * anonymous sessions, which is the normal "no bearer / not logged in" case
     * rather than an error.
     */
    fetchAccountProfile(sessionId: string): Promise<AomiAccountProfile | null>;
    /**
     * Fetch the full account for the authenticated request. Throws on any
     * non-OK response; use `fetchAccountProfile` for the null-on-anonymous
     * variant.
     */
    getAccount(sessionId: string): Promise<AomiAccountResponse>;
    createAccountApproval(request: AomiCreateApprovalRequest): Promise<AomiAccessApproval>;
    /**
     * Mint a Privy browser auth URL bound to the current backend session.
     */
    beginPrivyAuth(sessionId: string, options?: {
        application?: string;
        walletFamily?: AomiAuthWalletFamily;
        purpose?: AomiAuthPurpose;
    }): Promise<AomiBeginAccountAuthResponse>;
    /**
     * Start Privy's separate one-time delegated-signer consent. This is not a
     * wallet-link operation and callers should label it as enabling Auto.
     */
    beginPrivyDelegation(sessionId: string, options?: {
        application?: string;
        walletFamily?: AomiAuthWalletFamily;
    }): Promise<AomiBeginAccountAuthResponse>;
    /**
     * Get available models.
     */
    getModels(sessionId: string, options?: {
        apiKey?: string;
        applicationId?: ApplicationId;
    }): Promise<string[]>;
    /**
     * Set the model for a session.
     */
    setModel(sessionId: string, rig: string, options?: {
        app?: string;
        applicationId?: ApplicationId;
        apiKey?: string;
        clientId?: string;
    }): Promise<{
        success: boolean;
        rig: string;
        baml: string;
        created: boolean;
    }>;
    /**
     * List BYOK keys (one per LLM provider) bound to the current account.
     */
    listByokKeys(sessionId: string): Promise<AomiByokKeyEntry[]>;
    /**
     * Save or replace a BYOK key for the current account.
     */
    saveByokKey(sessionId: string, provider: string, byokKey: string, label?: string): Promise<AomiByokKeyEntry>;
    /**
     * Delete a BYOK key for the current account.
     */
    deleteByokKey(sessionId: string, provider: string): Promise<boolean>;
    /**
     * Simulate transactions as an atomic batch.
     * Each tx sees state changes from previous txs (e.g., approve → swap).
     * Sends full tx payloads — the backend does not look up by ID.
     */
    simulateBatch(sessionId: string, transactions: Array<{
        to: string;
        value?: string;
        data?: string;
        label?: string;
        chain_id?: number;
        chainId?: number;
    }>, options?: {
        from?: string;
        chainId?: number;
    }): Promise<AomiSimulateResponse>;
}

type SiwsChainId = "solana:mainnet" | "solana:devnet" | "solana:testnet";
type SiwsIntent = "sign-in" | "link";
declare function buildSiwsMessage(input: {
    address: string;
    chainId: SiwsChainId;
    nonce: string;
    intent: SiwsIntent;
    domain: string;
    uri: string;
    issuedAt?: Date;
}): string;

type WidgetAuthSession = {
    accessToken: string;
    expiresAt: number;
};
/**
 * @deprecated Ambiguous with the `WidgetSession` type exported by
 * `@aomi-labs/account`, which describes a different (BFF-side) shape. Prefer
 * {@link WidgetAuthSession}. Retained as an alias for backward compatibility
 * with the published `@aomi-labs/client` API.
 */
type WidgetSession = WidgetAuthSession;
type WidgetAuthAdapter = {
    getFingerprint(): string | null | Promise<string | null>;
    exchange(input: {
        baseUrl: string;
        fetch: typeof fetch;
    }): Promise<WidgetAuthSession>;
    signOut?(): Promise<void>;
};
type WidgetSessionProvider = GetAccountBearer & {
    readonly required: true;
    revoke(): Promise<void>;
    signOut(): Promise<void>;
    dispose(): void;
    subscribe(listener: () => void): () => void;
};
type WidgetSessionSigner = {
    address: string;
    chainId: number;
    signMessage(message: string): Promise<string>;
};
type SiwsWidgetSessionSigner = {
    address: string;
    chainId: SiwsChainId;
    signMessage(message: string): Promise<string>;
};
type ProviderCredential = {
    provider: string;
    tokenKind?: string;
    providerToken: string;
    keyId?: string;
};
declare function createProviderCredentialAdapter(input: {
    provider: string;
    environment: string;
    getCredential(): Promise<ProviderCredential | null>;
    getSubject(): string | null;
    signOut?: () => Promise<void>;
}): WidgetAuthAdapter;
declare function createSiweWidgetAuthAdapter(input: {
    getSigner(): Promise<WidgetSessionSigner>;
}): WidgetAuthAdapter;
declare function createSiwsWidgetAuthAdapter(input: {
    getSigner(): Promise<SiwsWidgetSessionSigner>;
}): WidgetAuthAdapter;
declare function createWidgetSessionProvider(input: {
    baseUrl: string;
    adapter: WidgetAuthAdapter;
    fetch?: typeof fetch;
    now?: () => number;
    refreshBeforeExpiryMs?: number;
}): WidgetSessionProvider;
/**
 * Never blind-sign an authentication message.
 *
 * The message the wallet signs is built entirely from this server-supplied
 * challenge, so a compromised or misrouted upstream could otherwise hand the
 * user a signature bound to an attacker's domain, a stale nonce, or an
 * already-expired session. The Portal mints the challenge from the caller's
 * exact Origin (domain = host, uri = origin, no rewriting), which makes this
 * checkable client-side with zero configuration:
 *
 * - `uri` must be the origin this page is running on, and `domain` its host.
 *   In a browser that is `window.location`; in non-browser runtimes (tests,
 *   node scripts) there is no ambient origin to bind to, so the origin checks
 *   are skipped and only nonce/expiry hold.
 * - `nonce` must be present; `issuedAt` / `expirationTime` must describe a
 *   currently valid, bounded challenge window. Portal issues five-minute
 *   challenges; ten minutes leaves deployment skew without accepting an
 *   attacker-controlled long-lived signing request.
 *
 * Throwing here means the wallet prompt never appears — strictly better than
 * a signed-then-rejected round trip, and it restores default-on the guard
 * partner hosts (agentic-somm's deleted `assertSiweMessage`) used to carry
 * one-per-host.
 */
declare class WidgetChallengeBindingError extends Error {
    constructor(message: string);
}

/**
 * Structurally identical to {@link ProviderCredential}; aliased so the widget
 * and account credential shapes cannot drift within `@aomi-labs/client`.
 */
type AccountCredentialProvider = () => Promise<ProviderCredential>;
declare class AccountCredentialUnavailableError extends Error {
    constructor(message?: string);
}
type AccountSessionExchangeResponse = {
    access_token: string;
    token_type: "Bearer";
    expires_at: number;
    user_id: string;
};
type BetterAuthTokenResponse = {
    /** Aomi AccountBearer shape from /api/aomi/account-bearer. */
    bearer?: string;
    expires_at?: number;
    expiresAt?: number;
    user_id?: string;
    userId?: string;
};
type BetterAuthAccountTokenSourceOptions = {
    /** Portal/auth origin. Defaults to `baseUrl` when omitted. */
    baseUrl?: string;
    /**
     * When enabled, a missing Better Auth cookie can be created by exchanging the
     * connected wallet provider credential. Disable this when another account
     * runtime already owns provider exchange to avoid duplicate wallet prompts.
     */
    providerExchange?: boolean;
};
type AccountBearerProviderOptions = {
    baseUrl: string;
    getProviderCredential?: AccountCredentialProvider;
    betterAuthToken?: BetterAuthAccountTokenSourceOptions;
    fetch?: typeof fetch;
    now?: () => number;
    refreshBeforeExpiryMs?: number;
};
type AccountBearerProvider = GetAccountBearer & {
    subscribe: (listener: () => void) => () => void;
    dispose: () => void;
};
/** Cache and refresh the short-lived Aomi bearer used for backend requests. */
declare function createAccountBearerProvider({ baseUrl, getProviderCredential, betterAuthToken, fetch: fetchImpl, now, refreshBeforeExpiryMs, }: AccountBearerProviderOptions): AccountBearerProvider;

/**
 * Pays an x402 challenge and follows a new challenge only when the preceding
 * signed response includes a settlement receipt.
 */
declare function handlePaymentChallenges(request: Request, initialResponse: Response, fetchImpl: typeof globalThis.fetch, client: x402Client | x402HTTPClient): Promise<Response>;
/** Adds bounded sequential x402 settlement to a fetch implementation. */
declare function wrapFetchWithPaymentChallenges(fetchImpl: typeof globalThis.fetch, client: x402Client | x402HTTPClient): typeof globalThis.fetch;

/**
 * Canonical home for app-descriptor identity logic. The backend speaks
 * snake_case and may scope a single app `name` across multiple platforms, so
 * both normalization (wire shape → descriptor) and identity (descriptor →
 * stable key) live here to keep every consumer — client, React control state,
 * UI selectors, and any future server/BFF code — in lockstep.
 */
/**
 * Coerce an arbitrary wire item (string id, camelCase object, or snake_case
 * object) into a single camelCase {@link AomiAppDescriptor}. Returns null for
 * anything without a usable `name`.
 */
declare function normalizeAppDescriptor(item: unknown): AomiAppDescriptor | null;
/**
 * Stable key identifying an app for dedup and selection-matching. Prefers the
 * concrete backend `applicationId`, falls back to `platform:name`, then `name`.
 * Server-side dedup and client-side selection must agree, so both call this.
 */
declare function appIdentityKey(descriptor: AomiAppDescriptor): string;

/**
 * Read an environment variable defensively.
 *
 * The value is supplied through a thunk so the literal `process.env.X`
 * reference stays in the source — bundlers (Next.js, Vite `define`) still
 * inline it at build time — while the try/catch tolerates `process` being
 * undefined in pure-browser builds instead of throwing a ReferenceError.
 */
declare function safeEnv(read: () => string | undefined): string | undefined;

type Listener<T = unknown> = (payload: T) => void;
/**
 * Minimal typed event emitter with wildcard support.
 *
 * ```ts
 * type Events = { message: string; error: { code: number } };
 * const ee = new TypedEventEmitter<Events>();
 * ee.on("message", (msg) => console.log(msg));
 * ee.emit("message", "hello");
 * ```
 */
declare class TypedEventEmitter<EventMap extends Record<string, unknown> = Record<string, unknown>> {
    private listeners;
    on<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): () => void;
    once<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): () => void;
    emit<K extends keyof EventMap & string>(type: K, payload: EventMap[K]): void;
    off<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): void;
    removeAllListeners(): void;
}

type UnwrappedEvent = {
    type: string;
    payload: unknown;
};
declare function unwrapSystemEvent(event: AomiSystemEvent): UnwrappedEvent | null;

type AAMode = "4337" | "7702";
type AASponsorship = "disabled" | "optional" | "required";
type AAWalletCall = {
    to: Hex;
    value: bigint;
    data?: Hex;
    chainId: number;
};
/** The subset of AAWalletCall passed to wallet send methods (chainId already resolved). */
type AACallPayload = Omit<AAWalletCall, "chainId">;
type WalletCapabilities = {
    atomic?: {
        status?: string;
    };
    paymasterService?: {
        supported?: boolean;
    };
    [key: string]: unknown;
};
type WalletAtomicCapability = WalletCapabilities;
interface ExecutionResult {
    txHash: string;
    txHashes: string[];
    executionKind: string;
    batched: boolean;
    /**
     * Whether gas was paid by a paymaster.
     *
     * - `true`: paymaster paid, verified by the protocol
     *   (`sponsorship.mode === "required"` fails the tx if the paymaster
     *   rejects).
     * - `false`: no paymaster was attached (EOA path, or sendCalls fallback
     *   to sequential after sponsored-batch error).
     * - `undefined`: paymaster config was passed but the wallet may have
     *   silently fallen back to user-paid (Base Account with
     *   `sponsorship.mode === "optional"`). We cannot tell post-hoc without
     *   decoding the userOp logs.
     */
    sponsored: boolean | undefined;
}
/** A sequential executor confirmed a prefix before a later call failed. */
type PartialWalletExecution = {
    completedTxHashes: string[];
    failedCallIndex: number;
    failureReason: string;
};
interface AtomicBatchArgs {
    calls: AACallPayload[];
    chainId?: number;
    connector?: unknown;
    capabilities?: {
        atomic?: {
            required?: boolean;
            optional?: boolean;
        };
        paymasterService?: {
            context?: Record<string, unknown>;
            optional?: boolean;
            url: string;
        };
        [key: string]: unknown;
    };
    forceAtomic?: boolean;
    pollingInterval?: number;
    status?: (status: unknown) => boolean;
    throwOnFailure?: boolean;
    timeout?: number;
    version?: string;
}
type NativeWalletSponsorship = {
    mode: "disabled";
} | {
    mode: "optional";
    paymasterServiceUrl?: string;
    paymasterServiceContext?: SponsorshipPaymasterServiceContext;
} | {
    mode: "required";
    paymasterServiceUrl?: string;
    paymasterServiceContext?: SponsorshipPaymasterServiceContext;
};
type SponsorshipPaymasterServiceContext = Record<string, unknown> & {
    erc20?: never;
    paymasterAddress?: never;
};
interface NativeWalletExecutionPolicy {
    executionKind?: string;
    requiresAtomicForBatch?: boolean;
    sendCallsTimeoutMs?: number;
    sendCallsVersion?: string;
    sponsorship?: NativeWalletSponsorship;
}
interface ExecuteWalletCallsParams {
    callList: AAWalletCall[];
    currentChainId: number | undefined;
    capabilities: Record<string, WalletCapabilities> | undefined;
    localPrivateKey: `0x${string}` | null;
    nativeWalletExecution?: NativeWalletExecutionPolicy;
    sendCallsSyncAsync: (args: AtomicBatchArgs) => Promise<unknown>;
    sendTransactionAsync: (args: {
        chainId: number;
        to: Hex;
        value: bigint;
        data?: Hex;
    }) => Promise<string>;
    switchChainAsync: (params: {
        chainId: number;
    }) => Promise<unknown>;
    chainsById: Record<number, Chain>;
    getPreferredRpcUrl: (chain: Chain) => string;
}

type WalletTxAaPreference = "auto" | "eip4337" | "eip7702" | "none";
type WalletTxCallPayload = {
    txId: number;
    to: string;
    value?: string;
    data?: string;
    chainId?: number;
    from?: string;
    gas?: string;
    description?: string;
};
type WalletTxPayload = {
    to?: string;
    value?: string;
    data?: string;
    chainId?: number;
    txId?: number;
    txIds?: number[];
    aaPreference?: WalletTxAaPreference;
    aaStrict?: boolean;
    requestId?: string;
    calls?: WalletTxCallPayload[];
};
type HydrateTxPayloadOptions = {
    strict?: boolean;
};
type WalletEip712Payload = {
    /** Stable public Agent action id when projected from the canonical API. */
    requestId?: string;
    typed_data?: {
        domain?: {
            chainId?: number | string;
        };
        types?: Record<string, Array<{
            name: string;
            type: string;
        }>>;
        primaryType?: string;
        message?: Record<string, unknown>;
    };
    non_typed_data?: string;
    description?: string;
    eip712Id?: number;
    /** Expected EOA for an opaque signing request. */
    signer?: string;
    /** Requested EVM chain when the signature is execution-bound. */
    chainId?: number;
};
/**
 * Legacy internal SVM payload projected into the public `wallet_signing_request`.
 * in shape — singular sign-only — but carries a base64-encoded serialized
 * Solana transaction instead of EIP-712 typed data.
 *
 * `unsignedTx` is base64 of `VersionedTransaction.serialize()` (legacy
 * `Transaction.serialize()` also accepted by adapters). The host doesn't
 * decode it; the wallet adapter handles deserialization.
 */
type WalletSolanaSignPayload = {
    /** Stable public Agent action id when projected from the canonical API. */
    requestId?: string;
    /** Base64 of the unsigned Solana transaction. */
    unsignedTx?: string;
    /** Human-readable summary shown alongside the wallet's decoded preview. */
    description?: string;
    /** CAIP-2 cluster string (`"solana:mainnet"` / `"solana:devnet"`). */
    cluster?: string;
    /** Server-side correlation id for the staged sign request. */
    pendingSolanaId?: number;
    /** All staged instruction/transaction ids resolved by this wallet request. */
    pendingSolanaIds?: number[];
    /** Canonical multi-leg Agent action, in execution order. */
    transactions?: Array<{
        id: string;
        unsignedTx: string;
        description?: string;
    }>;
};
type WalletSolanaSignMessagePayload = {
    /** Stable public Agent action id when projected from the canonical API. */
    requestId?: string;
    /** Base64 of the raw message bytes to sign. */
    message?: string;
    /** Human-readable summary shown alongside the wallet's decoded preview. */
    description?: string;
    /** CAIP-2 cluster string (`"solana:mainnet"` / `"solana:devnet"`). */
    cluster?: string;
    /** Server-side correlation id for the staged sign request. */
    pendingSolanaId?: number;
};
type NormalizedSolanaWalletRequest = {
    kind: "solana_sign" | "solana_sign_message" | "solana_send" | "solana_sign_and_send";
    payload: WalletSolanaSignPayload | WalletSolanaSignMessagePayload;
};
type ViemSignTypedDataArgs = {
    domain?: Record<string, unknown>;
    types: Record<string, Array<{
        name: string;
        type: string;
    }>>;
    primaryType: string;
    message?: Record<string, unknown>;
};
type ViemSignMessageArgs = {
    message: string | {
        raw: Hex;
    };
};
/**
 * Normalize Solana's legacy cluster labels to the CAIP-style identifiers used
 * by the wallet runtime. Preserve unknown labels so callers can surface a
 * useful unsupported-cluster error instead of silently changing networks.
 */
declare function normalizeSolanaCluster(value: unknown): string | undefined;
declare function parseChainId(value: unknown): number | undefined;
/**
 * Normalize a wallet_tx_request payload into a consistent shape.
 * Hard cutover contract: requires `tx_ids`.
 */
declare function normalizeTxPayload(payload: unknown): WalletTxPayload | null;
declare function hydrateTxPayloadFromUserState(payload: WalletTxPayload, userState: unknown, options?: HydrateTxPayloadOptions): WalletTxPayload;
/**
 * Normalize a legacy internal SVM request into a consistent shape.
 *
 * Accepts the various nesting levels the backend can ship: top-level args,
 * `{ args: { ... } }`, snake_case (`unsigned_tx`, `pending_solana_id`) or
 * camelCase (`unsignedTx`, `pendingSolanaId`). Single source of truth for
 * the SDK's view of the request — both the dispatch path and the
 * `syncWalletRequests` reconstruction loop go through here.
 */
declare function normalizeSolanaSignPayload(payload: unknown): WalletSolanaSignPayload;
declare function normalizeSolanaSignMessagePayload(payload: unknown): WalletSolanaSignMessagePayload;
declare function normalizeSolanaWalletRequest(payload: unknown): NormalizedSolanaWalletRequest | null;
/**
 * Normalize an EIP-712 signing request payload.
 */
declare function normalizeEip712Payload(payload: unknown): WalletEip712Payload;
/**
 * Convert a normalized WalletTxPayload into AAWalletCalls.
 * This is the single boundary conversion point from backend payloads to AA-ready calls.
 */
declare function toAAWalletCalls(payload: WalletTxPayload, defaultChainId?: number): AAWalletCall[];
declare function toAAWalletCall(payload: WalletTxPayload, defaultChainId?: number): AAWalletCall;
/**
 * Convert normalized EIP-712 payloads into the viem signing shape used by both
 * the CLI and widget component layers.
 */
declare function toViemSignTypedDataArgs(payload: WalletEip712Payload): ViemSignTypedDataArgs | null;
/**
 * Convert normalized ERC-191/personal_sign payloads into viem signMessage args.
 * Hex strings are opaque bytes; all other strings are signed as UTF-8 text.
 */
declare function toViemSignMessageArgs(payload: WalletEip712Payload): ViemSignMessageArgs | null;

type WalletRequestKind = "transaction" | "signing" | "solana_send" | "solana_sign_and_send";
type WalletSignablePayload = {
    kind: "evm_personal";
    message: `0x${string}`;
} | {
    kind: "evm_typed_data";
    typedData: NonNullable<WalletEip712Payload["typed_data"]>;
} | {
    kind: "svm_message";
    messageBase64: string;
} | {
    kind: "svm_transaction";
    transactionBase64: string;
};
type WalletAaDisplayCall = {
    to: `0x${string}`;
    value: string;
    data?: `0x${string}`;
};
type WalletAaFeeAsset = {
    kind: "native";
} | {
    kind: "token";
    address: string;
};
type WalletAaFeeDisclosure = {
    asset: WalletAaFeeAsset;
    amount: string;
    /** EVM address or SVM base58 pubkey, per the request's `chainFamily`. */
    recipient: string;
};
type WalletSigningPayload = {
    requestId: string;
    chainFamily: "evm" | "svm";
    executionKind: "message" | "transaction" | "erc4337";
    signer: string;
    chainId?: number;
    cluster?: string;
    description: string;
    payloads: WalletSignablePayload[];
    broadcaster?: string;
    operationId?: string;
    executor?: `0x${string}`;
    expiresAt?: string;
    callsDigest?: `0x${string}`;
    calls?: WalletAaDisplayCall[];
    fees?: WalletAaFeeDisclosure[];
    sponsorship?: "required";
};
type WalletRequest = {
    id: string;
    kind: "transaction";
    payload: WalletTxPayload;
    timestamp: number;
} | {
    id: string;
    kind: "signing";
    payload: WalletSigningPayload;
    timestamp: number;
} | {
    id: string;
    kind: "solana_send";
    payload: WalletSolanaSignPayload;
    timestamp: number;
} | {
    id: string;
    kind: "solana_sign_and_send";
    payload: WalletSolanaSignPayload;
    timestamp: number;
};
type WalletRequestResult = {
    kind: "transaction";
    txHash: string;
    /** Per-leg hashes for sequential/batched execution, in action order. */
    txHashes?: string[];
    amount?: string;
    aaRequestedMode?: "4337" | "7702" | "none";
    aaResolvedMode?: "4337" | "7702" | "none";
    aaFallbackReason?: string;
    executionKind?: string;
    batched?: boolean;
    callCount?: number;
    sponsored?: boolean;
    SmartAccount4337?: string;
    Delegation7702?: string;
    /**
     * PARTIAL batch outcome. Sequential (non-atomic) executors can land a
     * prefix of a batch and then fail: reporting that as one blanket
     * failure erases the on-chain truth — the backend re-queues ALL legs,
     * the agent re-commits, and the already-executed leg double-spends
     * (observed: a 6-leg stake→wrap→supply→borrow where the 5 ETH stake
     * landed, the borrow reverted, and the retry re-staked the 5 ETH
     * against a 4.99 ETH balance). When set, `completedTxIds` narrows the
     * success `wallet:tx_complete` to the legs that actually mined, and
     * `failedTxIds`/`failureReason` emit a second, failed
     * `wallet:tx_complete` for the rest so the backend's ledger matches
     * the chain. Omit both for the atomic all-or-nothing paths (AA).
     */
    completedTxIds?: number[];
    failedTxIds?: number[];
    failureReason?: string;
} | {
    kind: "signing";
    signatures: string[];
} | {
    kind: "solana_send";
    signature: string;
    signedTx?: string;
    legs?: WalletSolanaLegResult[];
} | {
    kind: "solana_sign_and_send";
    signature: string;
    signedTx?: string;
    legs?: WalletSolanaLegResult[];
};
type WalletSolanaLegResult = {
    id: string;
    status: "submitted" | "rejected" | "failed" | "skipped";
    signature?: string;
    signedTx?: string;
    reason?: string;
};
type SendResult = {
    messages: AomiMessage[];
    title?: string;
};
type SessionOptions = {
    /** Agent is the permanent transport; legacy is an explicit rollback adapter. */
    transport?: "agent" | "legacy";
    /** Session ID. Auto-generated (crypto.randomUUID) if omitted. */
    sessionId?: string;
    /** App for chat messages. Default: "default" */
    app?: string;
    /** Optional model selected for the next Agent turn. */
    model?: string | null;
    /** Optional concrete application row to route chat/model calls to. */
    applicationId?: number | string | null;
    /** API key override. */
    apiKey?: string;
    /** User state to send with requests (wallet connection info, etc). */
    userState?: UserState;
    /** Optional client type hint forwarded to the backend via userState.ext.client_type. */
    clientType?: AomiClientType;
    /** Stable client ID used for secret-vault association. */
    clientId?: string;
    /** Optional backend payment method override for chat turns. */
    paymentMethod?: string | null;
    /**
     * When true (default), synthesize pending transaction wallet requests from
     * `user_state.pending_txs` during state sync. Web UI should disable this and
     * rely on explicit `wallet_tx_request` events from `send_transaction_to_wallet`.
     */
    syncPendingTxRequestsFromUserState?: boolean;
    /** Polling interval in ms. Default: 500 */
    pollIntervalMs?: number;
    /** Logger for debug output. Pass `console` for verbose logging. */
    logger?: {
        debug: (...args: unknown[]) => void;
    };
};
type SessionRuntimeOptions = {
    app: string;
    model?: string | null;
    applicationId?: number | string | null;
    apiKey?: string;
    clientId?: string;
    userState?: UserState;
};
type SessionEventMap = {
    wallet_tx_request: WalletRequest;
    wallet_signing_request: WalletRequest;
    wallet_solana_send_request: WalletRequest;
    wallet_solana_sign_and_send_request: WalletRequest;
    system_notice: {
        message: string;
    };
    system_error: {
        message: string;
    };
    async_callback: Record<string, unknown>;
    tool_update: AomiSSEEvent;
    tool_complete: AomiSSEEvent;
    task_started: AomiTaskStartedEvent;
    task_activity: AomiTaskActivityEvent;
    task_completed: AomiTaskCompletedEvent;
    title_changed: {
        title: string;
    };
    messages: AomiMessage[];
    user_state_updated: UserState;
    processing_start: undefined;
    processing_end: undefined;
    wallet_requests_changed: WalletRequest[];
    backend_idle: undefined;
    error: {
        error: unknown;
    };
    "*": {
        type: string;
        payload: unknown;
    };
};

declare function aaModeFromExecutionKind(executionKind: string | undefined): "4337" | "7702" | "none" | undefined;

declare class ClientSession extends TypedEventEmitter<SessionEventMap> {
    readonly client: AomiClient;
    readonly sessionId: string;
    private app;
    private model?;
    private applicationId?;
    private apiKey?;
    private userState?;
    private clientId;
    private paymentMethod?;
    private syncPendingTxRequestsFromUserState;
    private pollIntervalMs;
    private logger?;
    private readonly transport;
    private agentCursor?;
    private agentStatus?;
    private agentActions;
    private agentStartOperation?;
    private pollTimer;
    private pollingActive;
    private pollInFlight;
    private pollFailureCount;
    private unsubscribeSSE;
    private isSSEActive;
    private _isProcessing;
    private _backendWasProcessing;
    private walletController;
    private recoveringSigningRequestIds;
    private signingRecoveryInFlight;
    private signingRecoveryTimer;
    private lastSigningRecoveryAt;
    private _messages;
    private _title?;
    private closed;
    private pendingResolve;
    constructor(clientOrOptions: AomiClient | AomiClientOptions, sessionOptions?: SessionOptions);
    /**
     * Send a message and wait for the AI to finish processing.
     *
     * The returned promise resolves when `is_processing` becomes `false` AND
     * there are no pending wallet requests. If a wallet request arrives
     * mid-processing, polling continues but the promise pauses until the
     * request is resolved or rejected via `resolve()` / `reject()`.
     */
    send(message: string): Promise<SendResult>;
    /**
     * Send a message without waiting for completion.
     * Polling starts in the background; listen to events for updates.
     */
    sendAsync(message: string): Promise<AomiChatResponse>;
    /**
     * Resolve a pending wallet request. The `result.kind` discriminator must
     * match the originating request's kind — sending a `transaction` result for a `signing`
     * request would post the wrong wire event with empty fields, so we
     * fail fast at runtime instead.
     */
    resolve(requestId: string, result: WalletRequestResult): Promise<void>;
    /**
     * Reject a pending wallet request.
     * Sends an error to the backend and resumes polling.
     */
    reject(requestId: string, reason?: string): Promise<void>;
    /**
     * Drop a pending wallet request locally without completing it. Hosts should
     * normally use `resolve` or `reject`; this is reserved for externally
     * acknowledged lifecycle cleanup.
     */
    dismiss(requestId: string): void;
    /**
     * Cancel the AI's current response.
     */
    interrupt(): Promise<void>;
    /**
     * Close the session. Stops polling, unsubscribes SSE, removes all listeners.
     * The session cannot be used after closing.
     */
    close(): void;
    /** Current messages in the session. */
    getMessages(): AomiMessage[];
    /** Current session title. */
    getTitle(): string | undefined;
    /** Latest authoritative backend user_state snapshot seen by this session. */
    getUserState(): UserState | undefined;
    /** Pending wallet requests waiting for resolve/reject. */
    getPendingRequests(): WalletRequest[];
    /** Whether the AI is currently processing. */
    getIsProcessing(): boolean;
    /** Last status observed from the canonical Agent transport. */
    getAgentStatus(): AgentStatus | undefined;
    getIsSSEActive(): boolean;
    setSSEActive(active: boolean): void;
    syncRuntimeOptions(options: SessionRuntimeOptions): void;
    private startSSE;
    resolveUserState(userState: UserState, opts?: {
        skipEmit?: boolean;
    }): void;
    setClientType(clientType: AomiClientType): void;
    addExtValue(key: string, value: unknown): void;
    removeExtValue(key: string): void;
    resolveWallet(address: string, chainId?: number): void;
    /**
     * The subset of the stored state the client may send to the backend. Drops
     * backend-authority `pending` (in-flight requests the client only receives).
     */
    private outboundUserState;
    syncUserState(): Promise<AomiStateResponse>;
    /** Whether the session is currently polling for state updates. */
    getIsPolling(): boolean;
    /**
     * Fetch the current state from the backend (one-shot).
     * Automatically starts polling if the backend is processing.
     */
    fetchCurrentState(): Promise<void>;
    /**
     * Start polling for state updates. Idempotent — no-op if already polling.
     * Useful for resuming polling after resolving a wallet request.
     */
    startPolling(): void;
    /** Stop polling for state updates. Idempotent — no-op if not polling. */
    stopPolling(): void;
    private pollTick;
    private currentPollInterval;
    private schedulePoll;
    private handleVisibilityChange;
    private applyState;
    /**
     * Coalesce recovery behind one request and a bounded cadence. State polling
     * may run twice per second; durable handoff recovery does not need to.
     */
    private scheduleSigningRequestRecovery;
    /**
     * A signing event is transient, but its backend-owned operation is durable.
     * Recover an attended handoff from the operation view when a tab reload or
     * reconnect happens after the original event was delivered.
     */
    private recoverSigningRequests;
    private fetchSigningRequests;
    private handleSSEEvent;
    private sendSystemEvent;
    private completeSigningRequest;
    /** Shared completion path for send()/sendAsync() after the chat POST. */
    private submitChat;
    private agentActive;
    private agentState;
    private agentWallets;
    private applyAgentDelta;
    private agentMessage;
    private applyAgentActivity;
    private syncAgentActions;
    private enqueueAgentAction;
    private resolveAgentAction;
    private rejectAgentAction;
    private actionIdForRequest;
    private resumeAfterWalletResponse;
    private resolvePending;
    private assertOpen;
    private assertUserStateAligned;
}

type ChainInfo = {
    id: number;
    name: string;
    ticker: string;
};
declare const monad: {
    blockExplorers: {
        readonly default: {
            readonly name: "Monad Explorer";
            readonly url: "https://monadexplorer.com";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: viem.ChainContract | {
            [sourceId: number]: viem.ChainContract | undefined;
        } | undefined;
        ensRegistry?: viem.ChainContract | undefined;
        ensUniversalResolver?: viem.ChainContract | undefined;
        multicall3?: viem.ChainContract | undefined;
        erc6492Verifier?: viem.ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 143;
    name: "Monad";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "Monad";
        readonly symbol: "MON";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.monad.xyz"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet?: boolean | undefined | undefined;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: viem.ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | [fn: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: viem.ChainSerializers<undefined, viem.TransactionSerializable> | undefined;
    verifyHash?: ((client: viem.Client, parameters: viem.VerifyHashActionParameters) => Promise<viem.VerifyHashActionReturnType>) | undefined;
};
declare const monadTestnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "Monad Testnet Explorer";
            readonly url: "https://testnet.monadexplorer.com";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: viem.ChainContract | {
            [sourceId: number]: viem.ChainContract | undefined;
        } | undefined;
        ensRegistry?: viem.ChainContract | undefined;
        ensUniversalResolver?: viem.ChainContract | undefined;
        multicall3?: viem.ChainContract | undefined;
        erc6492Verifier?: viem.ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 10143;
    name: "Monad Testnet";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "Monad";
        readonly symbol: "MON";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://testnet-rpc.monad.xyz"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: viem.ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | [fn: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: viem.ChainSerializers<undefined, viem.TransactionSerializable> | undefined;
    verifyHash?: ((client: viem.Client, parameters: viem.VerifyHashActionParameters) => Promise<viem.VerifyHashActionReturnType>) | undefined;
};
declare const robinhood: {
    blockExplorers: {
        readonly default: {
            readonly name: "Robinhood Chain Explorer";
            readonly url: "https://robinhoodchain.blockscout.com";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: viem.ChainContract | {
            [sourceId: number]: viem.ChainContract | undefined;
        } | undefined;
        ensRegistry?: viem.ChainContract | undefined;
        ensUniversalResolver?: viem.ChainContract | undefined;
        multicall3?: viem.ChainContract | undefined;
        erc6492Verifier?: viem.ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 4663;
    name: "Robinhood Chain";
    nativeCurrency: {
        readonly name: "Ether";
        readonly symbol: "ETH";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.mainnet.chain.robinhood.com"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet?: boolean | undefined | undefined;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: viem.ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | [fn: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: viem.ChainSerializers<undefined, viem.TransactionSerializable> | undefined;
    verifyHash?: ((client: viem.Client, parameters: viem.VerifyHashActionParameters) => Promise<viem.VerifyHashActionReturnType>) | undefined;
};
declare const megaeth: {
    blockExplorers: {
        readonly default: {
            readonly name: "MegaETH Explorer";
            readonly url: "https://mega.etherscan.io";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: viem.ChainContract | {
            [sourceId: number]: viem.ChainContract | undefined;
        } | undefined;
        ensRegistry?: viem.ChainContract | undefined;
        ensUniversalResolver?: viem.ChainContract | undefined;
        multicall3?: viem.ChainContract | undefined;
        erc6492Verifier?: viem.ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 4326;
    name: "MegaETH";
    nativeCurrency: {
        readonly name: "Ether";
        readonly symbol: "ETH";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://mainnet.megaeth.com/rpc"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet?: boolean | undefined | undefined;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: viem.ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | [fn: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: viem.ChainSerializers<undefined, viem.TransactionSerializable> | undefined;
    verifyHash?: ((client: viem.Client, parameters: viem.VerifyHashActionParameters) => Promise<viem.VerifyHashActionReturnType>) | undefined;
};
declare const arcTestnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "ArcScan";
            readonly url: "https://testnet.arcscan.app";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: viem.ChainContract | {
            [sourceId: number]: viem.ChainContract | undefined;
        } | undefined;
        ensRegistry?: viem.ChainContract | undefined;
        ensUniversalResolver?: viem.ChainContract | undefined;
        multicall3?: viem.ChainContract | undefined;
        erc6492Verifier?: viem.ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 5042002;
    name: "Arc Testnet";
    nativeCurrency: {
        readonly name: "USDC";
        readonly symbol: "USDC";
        readonly decimals: 6;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.testnet.arc.io", "https://rpc.drpc.testnet.arc.io", "https://rpc.quicknode.testnet.arc.io"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: viem.ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | [fn: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: viem.ChainSerializers<undefined, viem.TransactionSerializable> | undefined;
    verifyHash?: ((client: viem.Client, parameters: viem.VerifyHashActionParameters) => Promise<viem.VerifyHashActionReturnType>) | undefined;
};
declare const SUPPORTED_CHAINS: readonly [{
    readonly id: 1;
    readonly name: "Ethereum";
    readonly ticker: "ETH";
}, {
    readonly id: 137;
    readonly name: "Polygon";
    readonly ticker: "MATIC";
}, {
    readonly id: 42161;
    readonly name: "Arbitrum";
    readonly ticker: "ARB";
}, {
    readonly id: 8453;
    readonly name: "Base";
    readonly ticker: "BASE";
}, {
    readonly id: 84532;
    readonly name: "Base Sepolia";
    readonly ticker: "ETH";
}, {
    readonly id: 10;
    readonly name: "Optimism";
    readonly ticker: "OP";
}, {
    readonly id: 11155111;
    readonly name: "Sepolia";
    readonly ticker: "SEP";
}, {
    readonly id: 59144;
    readonly name: "Linea Mainnet";
    readonly ticker: "LINEA";
}, {
    readonly id: 59141;
    readonly name: "Linea Sepolia Testnet";
    readonly ticker: "LINEA";
}, {
    readonly id: 143;
    readonly name: "Monad";
    readonly ticker: "MON";
}, {
    readonly id: 10143;
    readonly name: "Monad Testnet";
    readonly ticker: "MON";
}, {
    readonly id: 4663;
    readonly name: "Robinhood Chain";
    readonly ticker: "ETH";
}, {
    readonly id: 4326;
    readonly name: "MegaETH";
    readonly ticker: "ETH";
}, {
    readonly id: 5042002;
    readonly name: "Arc Testnet";
    readonly ticker: "USDC";
}, {
    readonly id: 31337;
    readonly name: "Anvil (local)";
    readonly ticker: "ETH";
}];
declare const SUPPORTED_CHAIN_IDS: (1 | 10 | 143 | 10143 | 4663 | 4326 | 5042002 | 137 | 42161 | 8453 | 84532 | 11155111 | 59144 | 59141 | 31337)[];
declare const CHAIN_NAMES: Record<number, string>;
/** Alchemy network slugs for proxy URL construction. */
declare const ALCHEMY_CHAIN_SLUGS: Record<number, string>;
declare const CHAINS_BY_ID: Record<number, Chain>;

declare class PartialWalletExecutionError extends Error {
    readonly partial: PartialWalletExecution;
    constructor(error: unknown, completedTxHashes: string[], failedCallIndex: number);
}
declare function partialWalletExecution(error: unknown): PartialWalletExecution | undefined;
/**
 * Execute staged wallet calls with the native wallet surface: a local private
 * key (sequential sends), or the connected wallet via EIP-5792 `sendCalls`
 * (atomic batching + wallet-side paymaster sponsorship) with sequential
 * `sendTransaction` fallback.
 *
 * Client-side smart-account (4337/7702) construction was removed — account
 * abstraction for held keys is executed server-side by the backend.
 */
declare function executeWalletCalls(params: ExecuteWalletCallsParams): Promise<ExecutionResult>;

/** Max fee auto-injection threshold (0.05 native token). */
declare const MAX_AUTO_FEE_WEI: bigint;
type NormalizedSimulatedFee = {
    recipient: Hex;
    amountWei: bigint;
};
declare function normalizeSimulatedFee(fee: AomiSimulateFee): NormalizedSimulatedFee | null;
declare function buildFeeAAWalletCall(fee: AomiSimulateFee, chainId: number): AAWalletCall | null;
declare function appendFeeCallToPayload(payload: WalletTxPayload, fee: AomiSimulateFee, defaultChainId: number, options?: {
    forceAaPreference?: WalletTxAaPreference;
    strictAa?: boolean;
}): WalletTxPayload;

export { type AACallPayload, type AAMode, type AASponsorship, type AAWalletCall, ALCHEMY_CHAIN_SLUGS, AOMI_TASK_EVENT_TYPES, type AccountBearerProvider, type AccountBearerProviderOptions, type AccountCredentialProvider, AccountCredentialUnavailableError, type AccountSessionExchangeResponse, type AgentAction, type AgentActionResult, type AgentActivity, AgentApiError, type AgentDelta, type AgentMessage, type AgentSessionPage, type AgentSessionRecord, type AgentStartRequest, type AgentStatus, AgentTransport, type AgentWalletContext, type AomiAccessApproval, type AomiAccountProfile, type AomiAccountResponse, type AomiAppDescriptor, type AomiAuthIdentity, type AomiAuthPurpose, type AomiAuthorizationChallenge, type AomiAuthorizationPermit, type AomiAuthorizationState, type AomiChatResponse, type AomiClearSecretsResponse, AomiClient, type AomiClientOptions, type AomiClientType, type AomiCreateApprovalRequest, type AomiCreateThreadResponse, type AomiDeleteSecretResponse, type AomiEnsureBoundResult, type AomiHttpMethod, type AomiIdentityWallet, type AomiIngestSecretsResponse, type AomiInterruptResponse, type AomiListSecretsResponse, type AomiMessage, type AomiOAuthResource, type AomiOAuthTokenProvider, type AomiOAuthTokenRequest, type AomiOAuthTokenSet, type AomiPlatformFilter, type AomiRequestOptions, type AomiRequestQueryValue, type AomiSSEEvent, type AomiSSEEventType, type AomiSecretSlot, type AomiSimulateFee, type AomiSimulateResponse, type AomiStateResponse, type AomiSystemEvent, type AomiSystemResponse, type AomiTaskActivityEvent, type AomiTaskActivityKind, type AomiTaskCompletedEvent, type AomiTaskEvent, type AomiTaskEventType, type AomiTaskStartedEvent, type AomiTaskStatus, type AomiThread, type AomiUsageStats, type AomiUser, type AomiWalletFamily, type ApplicationId, type AtomicBatchArgs, type AuthorizationPoster, type BetterAuthAccountTokenSourceOptions, type BetterAuthTokenResponse, CHAINS_BY_ID, CHAIN_NAMES, CLIENT_TYPE_TS_CLI, CLIENT_TYPE_WEB_UI, type ChainInfo, type EvmExternalTransactionAction, type ExecuteWalletCallsParams, type ExecutionResult, type GetAccountBearer, type GuestSessionProvider, type Logger, MAX_AUTO_FEE_WEI, type NativeWalletExecutionPolicy, type NativeWalletSponsorship, type NormalizedSimulatedFee, type NormalizedSolanaWalletRequest, type OwnedUserState, type PartialWalletExecution, PartialWalletExecutionError, type PipelineAction, PipelineApiError, type PipelineAppResponse, type PipelineAppsResponse, type PipelineCatalogResponse, type PipelineExecutionOptions, type PipelineExecutionResponse, type PipelineListOptions, type PipelineResource, type PipelineRunRequest, type PipelineSearchOptions, type PipelineSearchResponse, type PipelineSkillsResponse, type PipelineToolCallRequest, type PipelineToolListOptions, type PipelineToolResponse, type PipelineToolSearchOptions, type PipelineToolsResponse, PipelineTransport, type ProviderCredential, SUPPORTED_CHAINS, SUPPORTED_CHAIN_IDS, type SendResult, ClientSession as Session, type SessionEventMap, type SessionOptions, type SigningRequestAction, type SiwsChainId, type SiwsIntent, type SiwsWidgetSessionSigner, type SponsorshipPaymasterServiceContext, type SvmExternalTransactionAction, TypedEventEmitter, type UnwrappedEvent, UserState, type UserStateAAMode, type UserStateAuthMethod, type UserStateWalletProvider, type ViemSignMessageArgs, type ViemSignTypedDataArgs, type WalletAtomicCapability, type WalletCapabilities, type WalletEip712Payload, type WalletRequest, type WalletRequestKind, type WalletRequestResult, type WalletSignablePayload, type WalletSigningPayload, type WalletSolanaLegResult, type WalletSolanaSignMessagePayload, type WalletSolanaSignPayload, type WalletTxAaPreference, type WalletTxCallPayload, type WalletTxPayload, type WidgetAuthAdapter, type WidgetAuthSession, WidgetChallengeBindingError, type WidgetSession, type WidgetSessionProvider, type WidgetSessionSigner, aaModeFromExecutionKind, appIdentityKey, appendFeeCallToPayload, arcTestnet, authorizationChallenge, authorizationCommit, buildFeeAAWalletCall, buildSiwsMessage, createAccountBearerProvider, createGuestSessionProvider, createOAuthTokenProvider, createProviderCredentialAdapter, createSiweWidgetAuthAdapter, createSiwsWidgetAuthAdapter, createWidgetSessionProvider, ensureSvmWalletBound, ensureSvmWalletBoundVia, executeWalletCalls, handlePaymentChallenges, hydrateTxPayloadFromUserState, isAomiTaskEventType, isAsyncCallback, isInlineCall, isSystemError, isSystemNotice, isUnboundWalletError, megaeth, monad, monadTestnet, normalizeAppDescriptor, normalizeEip712Payload, normalizeSimulatedFee, normalizeSolanaCluster, normalizeSolanaSignMessagePayload, normalizeSolanaSignPayload, normalizeSolanaWalletRequest, normalizeTxPayload, parseAomiTaskEvent, parseChainId, partialWalletExecution, posterFromClient, robinhood, safeEnv, secretNamesFrom, toAAWalletCall, toAAWalletCalls, toViemSignMessageArgs, toViemSignTypedDataArgs, unwrapSystemEvent, wrapFetchWithPaymentChallenges };
