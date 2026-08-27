import { x402Client, x402HTTPClient } from '@x402/core/client';
import * as viem from 'viem';
import { Hex, Chain } from 'viem';

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

declare function address(userState?: UserState$1 | null): string | undefined;
declare function svmAddress(userState?: UserState$1 | null): string | undefined;
declare function chainId(userState?: UserState$1 | null): number | undefined;
declare function ensName(userState?: UserState$1 | null): string | undefined;
declare function isConnected(userState?: UserState$1 | null): boolean | undefined;
declare function walletProvider(userState?: UserState$1 | null): UserStateWalletProvider | null | undefined;
declare function walletProviderSubject(userState?: UserState$1 | null): string | null | undefined;
declare function authMethod(userState?: UserState$1 | null): UserStateAuthMethod | null | undefined;
declare function authValue(userState?: UserState$1 | null): string | null | undefined;
declare function authVerifiedAt(userState?: UserState$1 | null): number | null | undefined;
declare function withExt(userState: UserState$1, key: string, value: unknown): UserState$1;

declare function normalizeUserState(userState?: UserState$1 | null): UserState$1 | undefined;
declare function reconcileUserState(previousUserState?: UserState$1 | null, incomingUserState?: UserState$1 | null): UserState$1 | undefined;
/**
 * Return the canonical client-owned UserState shape.
 */
declare function toOwnedUserState(userState?: UserState$1 | null): OwnedUserState | undefined;

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
 * The client owns every field in UserState. Runtime execution and continuation
 * data live only in durable Actions and cannot enter this shape.
 */
type OwnedUserState = UserState$1;
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
interface UserState$1 extends Record<string, unknown> {
    connection?: UserStateConnection | null;
    evm?: UserStateEvm | null;
    svm?: UserStateSvm | null;
    ext?: Record<string, unknown> | null;
    preferences?: Record<string, unknown> | null;
}
declare namespace UserState$1 {
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
type AomiAccountResponse = AomiAccountProfile;
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
declare function parseAomiTaskEvent(event: Record<string, unknown> | AomiTaskEvent): AomiTaskEvent | null;
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

interface components {
    schemas: {
        StartTurnIntent: {
            sessionId?: string | null;
            message: string;
            applicationId?: number | null;
            app?: string | null;
            model?: string | null;
            userState?: components["schemas"]["UserState"] | null;
            clientId?: string | null;
        };
        InterruptIntent: {
            turnId: string;
        };
        RespondToActionIntent: {
            revision: number;
            result: components["schemas"]["ActionResult"];
        };
        /** @description Client-owned wallet provider, addresses, preferences, and extension values only. */
        UserState: {
            connection?: {
                [key: string]: unknown;
            };
            evm?: {
                [key: string]: unknown;
            };
            svm?: {
                [key: string]: unknown;
            };
            preferences?: {
                [key: string]: unknown;
            };
            ext?: {
                [key: string]: unknown;
            };
        };
        EventPage: {
            session_id: string;
            cursor: string;
            events: components["schemas"]["ConcreteEvent"][];
            has_more: boolean;
        };
        EventMeta: {
            event_id: string;
            sequence: number;
            turn_id: string | null;
            occurred_at: number;
            type: string;
        };
        ConcreteEvent: components["schemas"]["MessageEvent"] | components["schemas"]["TurnStateChangedEvent"] | components["schemas"]["ToolEvent"] | components["schemas"]["TaskEvent"] | components["schemas"]["TitleEvent"] | components["schemas"]["ErrorEvent"] | components["schemas"]["Action"];
        MessageEvent: components["schemas"]["EventMeta"] & {
            /** @constant */
            type: "message";
            message_key?: string | null;
            /** @enum {unknown} */
            sender: "user" | "agent" | "system" | "notice";
            content: string;
            is_streaming?: boolean;
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "message";
        };
        TurnStateChangedEvent: components["schemas"]["EventMeta"] & {
            /** @constant */
            type: "turn_state_changed";
            /** @enum {unknown} */
            state: "processing" | "awaiting_action" | "complete" | "interrupted" | "failed";
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "turn_state_changed";
        };
        ToolEvent: components["schemas"]["EventMeta"] & ({
            /** @enum {unknown} */
            type: "tool_update" | "tool_complete";
        } & {
            [key: string]: unknown;
        }) & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "tool_update" | "tool_complete";
        };
        TaskEvent: components["schemas"]["EventMeta"] & ({
            /** @enum {unknown} */
            type: "task_started" | "task_activity" | "task_completed";
        } & {
            [key: string]: unknown;
        }) & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "task_started" | "task_activity" | "task_completed";
        };
        TitleEvent: components["schemas"]["EventMeta"] & {
            /** @constant */
            type: "title_changed";
            title: string;
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "title_changed";
        };
        ErrorEvent: components["schemas"]["EventMeta"] & {
            /** @constant */
            type: "error";
            message: string;
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "error";
        };
        Action: components["schemas"]["EventMeta"] & {
            /** @constant */
            type: "action";
            id: string;
            revision: number;
            /** @enum {unknown} */
            state: "pending" | "submitted" | "completed" | "rejected" | "expired" | "failed";
            request: components["schemas"]["ActionRequest"];
            result?: components["schemas"]["ActionResult"] | null;
            created_at: number;
            expires_at: number | null;
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "action";
        };
        ActionRequest: {
            /** @constant */
            type: "execute_evm";
            transactions: components["schemas"]["AssembledEvmTransaction"][];
        } | {
            /** @constant */
            type: "execute_svm";
            transactions: components["schemas"]["AssembledSvmTransaction"][];
        } | (components["schemas"]["SigningRequest"] & {
            /** @constant */
            type: "sign";
        });
        AssembledEvmTransaction: {
            chain_id: number;
            from: string;
            to: string;
            value?: string;
            gas?: string;
            data: string;
            label: string;
            kind: string;
            protocol?: string;
        };
        AssembledSvmTransaction: {
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
        };
        SigningRequest: {
            requestId: string;
            /** @enum {unknown} */
            chainFamily: "evm" | "svm";
            executionKind: string;
            signer: string;
            chainId?: number;
            cluster?: string;
            description: string;
            payloads: components["schemas"]["SignablePayload"][];
            broadcaster?: string;
            operationId?: string;
            executor?: string;
            expiresAt?: string;
            callsDigest?: string;
            calls?: Record<string, never>[];
            fees?: Record<string, never>[];
            sponsorship?: string;
        };
        SignablePayload: {
            /** @constant */
            kind: "evm_personal";
            message: string;
        } | {
            /** @constant */
            kind: "evm_typed_data";
            typed_data: Record<string, never>;
        } | {
            /** @constant */
            kind: "svm_message";
            message_base64: string;
        } | {
            /** @constant */
            kind: "svm_transaction";
            transaction_base64: string;
        };
        ActionResult: {
            /** @constant */
            status: "submitted";
            legs: components["schemas"]["TransactionResult"][];
        } | {
            /** @constant */
            status: "signed";
            outputs: components["schemas"]["SigningResult"][];
        } | {
            /** @constant */
            status: "rejected";
            reason: string;
        };
        TransactionResult: {
            id: string;
            /** @enum {unknown} */
            status: "submitted" | "rejected" | "failed" | "skipped";
            transactionId?: string;
            signedTransactionBase64?: string;
            reason?: string;
        };
        SigningResult: {
            id: string;
            signature?: string;
            signedTransactionBase64?: string;
        };
        Session: {
            id: string;
            title?: string | null;
            updatedAt: number;
            archived: boolean;
        };
        SessionPage: {
            sessions: components["schemas"]["Session"][];
            nextCursor?: string | null;
        };
        UpdateSessionRequest: {
            title?: string | null;
            archived?: boolean | null;
        };
        ErrorEnvelope: {
            error: unknown;
        };
        PipelineDirectory: {
            /** @constant */
            kind: "directory";
            path: string;
            entries: {
                name: string;
                kind: string;
                href: string;
            }[];
            /** @description Opaque continuation link for the next deterministic catalog page. */
            next?: string | null;
        };
        PipelineOperationDescriptor: {
            /** @constant */
            kind: "operation";
            name: string;
            /** @constant */
            method: "POST";
            href: string;
            inputSchema?: Record<string, never>;
        } & {
            [key: string]: unknown;
        };
        /** @description Build request, explicit stage input, or a complete portable Build envelope depending on the endpoint. */
        PipelineLifecycleRequest: Record<string, never>;
        PipelineBuild: {
            /** @constant */
            version: 1;
            /** @enum {unknown} */
            status: "staged" | "simulated";
            actions: unknown[];
            provenance: Record<string, never>;
            simulation?: unknown;
            summary?: unknown;
            digest: string;
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
        /** @description Filesystem-like capability directory */
        PipelineDirectory: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["PipelineDirectory"];
            };
        };
        /** @description Callable operation descriptor with a Catalog-sourced input schema */
        PipelineOperation: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["PipelineOperationDescriptor"];
            };
        };
    };
    parameters: {
        SessionId: string;
        ActionId: string;
        PipelineApp: string;
        IdempotencyKey: string;
        PipelineOperation: string;
        PipelineSkill: string;
        CatalogCursor: string;
        AppPageLimit: number;
        CatalogPageLimit: number;
    };
    requestBodies: {
        PipelineArguments: {
            content: {
                "application/json": Record<string, never>;
            };
        };
    };
    headers: never;
    pathItems: never;
}

type Schemas = components["schemas"];
type Event = Schemas["ConcreteEvent"];
type EventPage = Schemas["EventPage"];
type MessageEvent$1 = Schemas["MessageEvent"];
type TurnStateChangedEvent = Schemas["TurnStateChangedEvent"];
type ToolEvent$1 = Schemas["ToolEvent"];
type TaskEvent$1 = Schemas["TaskEvent"];
type TitleEvent$1 = Schemas["TitleEvent"];
type ErrorEvent$1 = Schemas["ErrorEvent"];
type Action = Schemas["Action"];
type ActionRequest = Schemas["ActionRequest"];
type ActionResult = Schemas["ActionResult"];
type UserState = Schemas["UserState"];
type StartTurnIntent = Schemas["StartTurnIntent"];
type InterruptIntent = Schemas["InterruptIntent"];
type RespondToActionIntent = Schemas["RespondToActionIntent"];
type Session = Schemas["Session"];
type SessionPage = Schemas["SessionPage"];
type TurnState = TurnStateChangedEvent["state"];

type RequestResponse$1 = (method: AomiHttpMethod, path: string, options?: AomiRequestOptions) => Promise<Response>;
declare class AgentApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly retryable: boolean;
    readonly requestId?: string | undefined;
    readonly details?: unknown | undefined;
    constructor(status: number, code: string, message: string, retryable: boolean, requestId?: string | undefined, details?: unknown | undefined);
}
declare class AgentTransport {
    private readonly requestResponse;
    readonly sessions: AgentSessionsTransport;
    constructor(requestResponse: RequestResponse$1);
    start(intent: StartTurnIntent, options?: {
        idempotencyKey?: string;
        paymentSignature?: string;
    }): Promise<EventPage>;
    poll(sessionId: string, options?: {
        cursor?: string;
        waitMs?: number;
    }): Promise<EventPage>;
    interrupt(sessionId: string, turnId: string, idempotencyKey?: string): Promise<EventPage>;
    respondToAction(sessionId: string, actionId: string, revision: number, result: ActionResult, idempotencyKey?: string): Promise<Action>;
    private json;
}
declare class AgentSessionsTransport {
    private readonly requestResponse;
    constructor(requestResponse: RequestResponse$1);
    list(options?: {
        cursor?: string;
        limit?: number;
    }): Promise<SessionPage>;
    all(): Promise<Session[]>;
    get(sessionId: string): Promise<Session>;
    update(sessionId: string, patch: {
        title?: string;
        archived?: boolean;
    }): Promise<Session>;
    delete(sessionId: string): Promise<void>;
    private json;
}

/** JSON Schema as returned by the live Pipeline Catalog. */
type PipelineJsonSchema = boolean | Record<string, unknown>;
type PipelineDirectoryEntryKind = "directory" | "operation" | "document";
interface PipelineDirectoryEntry {
    name: string;
    kind: PipelineDirectoryEntryKind;
    href: string;
    description?: string;
}
interface PipelineDirectory {
    kind: "directory";
    path: string;
    entries: PipelineDirectoryEntry[];
}
interface PipelineOperationDescriptor {
    kind: "operation";
    name: string;
    description: string;
    method: "POST";
    href: string;
    inputSchema: PipelineJsonSchema;
    outputSchema?: PipelineJsonSchema;
    chainFamily?: "evm" | "svm";
}
interface PipelineDocument {
    kind: "document";
    name: string;
    href: string;
    mediaType: string;
    content: string;
}
type PipelineFilesystemResource = PipelineDirectory | PipelineOperationDescriptor | PipelineDocument;
interface PipelineOperationInvocation<Arguments extends Record<string, unknown> = Record<string, unknown>> {
    operation: string;
    arguments: Arguments;
}
type PipelineOperationBuildInput<Arguments extends Record<string, unknown> = Record<string, unknown>> = PipelineOperationInvocation<Arguments> | {
    operations: PipelineOperationInvocation<Arguments>[];
};
interface PipelineInvokeOptions {
    /** Validate arguments against the live operation descriptor before POSTing. */
    validate?: boolean;
    idempotencyKey?: string;
    paymentSignature?: string;
}
interface PipelineCommitOptions {
    /** Defaults to the portable Build digest, making repeated commits stable. */
    idempotencyKey?: string;
    paymentSignature?: string;
}
type PipelineSimulationStatus = "passed" | "failed";
interface PipelineBalanceChange {
    account?: string;
    asset: string;
    amount: string;
    direction?: "in" | "out";
    symbol?: string;
    decimals?: number;
    chainId?: number;
    cluster?: string;
}
interface PipelineFeeEstimate {
    asset: string;
    amount: string;
    symbol?: string;
    usdValue?: string;
    kind?: string;
}
interface PipelineGuardResult {
    name: string;
    status: "passed" | "failed" | "warning";
    message?: string;
}
interface PipelineSimulation {
    status: PipelineSimulationStatus;
    balanceChanges: PipelineBalanceChange[];
    fees: PipelineFeeEstimate[];
    warnings: string[];
    guards?: PipelineGuardResult[];
    gas?: Record<string, unknown>;
    logs?: unknown[];
}
interface PipelineActionSummary {
    title?: string;
    description?: string;
    actionCount?: number;
    transactionCount?: number;
    assetsIn?: string[];
    assetsOut?: string[];
    contracts?: string[];
    programs?: string[];
    chains?: Array<number | string>;
}
interface EvmCallInput {
    to: `0x${string}`;
    data?: `0x${string}`;
    /** bigint is accepted at the SDK boundary and encoded as a decimal string. */
    value?: bigint | string;
    from?: `0x${string}`;
    gas?: bigint | string;
    description?: string;
}
interface EvmCall extends Omit<EvmCallInput, "value" | "gas"> {
    value?: string;
    gas?: string;
}
interface EvmStageActionInput {
    chainId: number;
    calls: EvmCallInput[];
    description?: string;
}
interface EvmStageInput {
    actions: EvmStageActionInput[];
}
interface EvmDirectInput {
    chainId: number;
    calls: EvmCallInput[];
    description?: string;
}
interface EvmStagedAction {
    id: string;
    chainFamily?: "evm";
    kind?: "calls";
    status?: string;
    chainId: number;
    calls: EvmCall[];
    description?: string;
}
type EvmPresentedAction = EvmStagedAction & {
    chainFamily: "evm";
    kind: "calls";
};
interface EvmStagedBuild {
    version: 1;
    status: "staged";
    actions: EvmStagedAction[];
    digest: string;
}
interface EvmSimulatedBuild {
    version: 1;
    status: "simulated";
    actions: EvmStagedAction[];
    simulation: PipelineSimulation;
    summary?: PipelineActionSummary;
    digest: string;
}
interface PipelineTransactionReceipt {
    id?: string;
    transactionId: string;
    status?: "submitted" | "confirmed" | "failed";
    chainId?: number;
    cluster?: string;
    blockNumber?: number | string;
}
interface EvmCommitResult {
    version: 1;
    status: "committed" | "submitted" | "awaiting_wallet";
    digest: string;
    receipts?: PipelineTransactionReceipt[];
    action?: Action;
    /** Present on high-level results when the configured wallet handled the Action. */
    actionResult?: ActionResult;
}
interface SvmAccountMeta {
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
}
interface SvmInstruction {
    programId: string;
    accounts: SvmAccountMeta[];
    /** Base64 by default; an explicit encoding keeps byte semantics unambiguous. */
    data: string;
    encoding?: "base64" | "base58";
}
interface SvmTransaction {
    transaction: string;
    encoding?: "base64";
    cluster?: string;
    feePayer?: string;
}
type SvmStageInput = {
    kind: "instructions";
    instructions: SvmInstruction[];
    cluster?: string;
    feePayer?: string;
} | {
    kind: "transaction";
    transaction: SvmTransaction;
};
type SvmDirectInput = SvmStageInput;
type SvmStagedAction = {
    id: string;
    chainFamily?: "svm";
    kind: "instructions";
    status?: string;
    instructions: SvmInstruction[];
    cluster?: string;
    description?: string;
} | {
    id: string;
    chainFamily?: "svm";
    kind: "transaction";
    status?: string;
    transaction: SvmTransaction;
    cluster?: string;
    description?: string;
};
type SvmPresentedAction = SvmStagedAction & {
    chainFamily: "svm";
};
interface SvmStagedBuild {
    version: 1;
    status: "staged";
    actions: SvmStagedAction[];
    digest: string;
}
interface SvmSimulatedBuild {
    version: 1;
    status: "simulated";
    actions: SvmStagedAction[];
    simulation: PipelineSimulation;
    summary?: PipelineActionSummary;
    digest: string;
}
interface SvmCommitResult {
    version: 1;
    status: "committed" | "submitted" | "awaiting_wallet";
    digest: string;
    receipts?: PipelineTransactionReceipt[];
    action?: Action;
    /** Present on high-level results when the configured wallet handled the Action. */
    actionResult?: ActionResult;
}

type RequestResponse = (method: AomiHttpMethod, path: string, options?: AomiRequestOptions) => Promise<Response>;
declare class PipelineApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly retryable: boolean;
    readonly requestId?: string | undefined;
    readonly details?: unknown | undefined;
    constructor(status: number, code: string, message: string, retryable: boolean, requestId?: string | undefined, details?: unknown | undefined);
}
declare class EvmPipelineTransport {
    private readonly requestResponse;
    constructor(requestResponse: RequestResponse);
    build(input: PipelineOperationBuildInput): Promise<EvmSimulatedBuild>;
    stage(input: EvmStageInput): Promise<EvmStagedBuild>;
    simulate(build: EvmStagedBuild): Promise<EvmSimulatedBuild>;
    commit(build: EvmSimulatedBuild, options?: PipelineCommitOptions): Promise<EvmCommitResult>;
}
declare class SvmPipelineTransport {
    private readonly requestResponse;
    constructor(requestResponse: RequestResponse);
    build(input: PipelineOperationBuildInput): Promise<SvmSimulatedBuild>;
    stage(input: SvmStageInput): Promise<SvmStagedBuild>;
    simulate(build: SvmStagedBuild): Promise<SvmSimulatedBuild>;
    commit(build: SvmSimulatedBuild, options?: PipelineCommitOptions): Promise<SvmCommitResult>;
}
declare class PipelineOperationTransport {
    private readonly requestResponse;
    readonly href: string;
    constructor(requestResponse: RequestResponse, scope: "apps" | "skills", owner: string);
    directory(): Promise<PipelineDirectory>;
    operations(): Promise<PipelineDirectory>;
    operation(name: string): Promise<PipelineOperationDescriptor>;
    invoke<T = unknown>(name: string, args: Record<string, unknown>, options?: PipelineInvokeOptions): Promise<T>;
}
declare class PipelineSkillTransport extends PipelineOperationTransport {
    private readonly skillRequestResponse;
    constructor(skillRequestResponse: RequestResponse, skill: string);
    instructions(): Promise<string>;
}
declare class PipelineAppsTransport {
    private readonly requestResponse;
    constructor(requestResponse: RequestResponse);
    list(): Promise<PipelineDirectory>;
    get(app: string): PipelineOperationTransport;
}
declare class PipelineSkillsTransport {
    private readonly requestResponse;
    constructor(requestResponse: RequestResponse);
    list(): Promise<PipelineDirectory>;
    get(skill: string): PipelineSkillTransport;
}
/** The wire-close typed transport for every first-party Pipeline consumer. */
declare class PipelineTransport {
    private readonly requestResponse;
    readonly evm: EvmPipelineTransport;
    readonly svm: SvmPipelineTransport;
    readonly apps: PipelineAppsTransport;
    readonly skills: PipelineSkillsTransport;
    constructor(requestResponse: RequestResponse);
    root(): Promise<PipelineDirectory>;
    read(path?: string): Promise<PipelineFilesystemResource>;
    app(name: string): PipelineOperationTransport;
    skill(name: string): PipelineSkillTransport;
    invoke<T = unknown>(path: string, args: Record<string, unknown>, options?: PipelineInvokeOptions): Promise<T>;
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
    constructor(options: AomiClientOptions);
    /**
     * Low-level request escape hatch for the full backend route manifest.
     * Prefer the typed helpers below for common chat/session/account flows.
     */
    request<T = unknown>(method: AomiHttpMethod, path: string, options?: AomiRequestOptions): Promise<T>;
    /** Raw authenticated response transport shared by JSON, SSE, and MCP clients. */
    requestResponse(method: AomiHttpMethod, path: string, options?: AomiRequestOptions): Promise<Response>;
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

declare class PipelineSchemaError extends TypeError {
    readonly path: string;
    constructor(path: string, message: string);
}
/**
 * Small dependency-free validator for the JSON Schema vocabulary emitted by
 * the live Catalog. The backend remains authoritative; this catches ordinary
 * integration mistakes before an operation POST without pretending to be a
 * complete JSON Schema implementation.
 */
declare function validatePipelineArguments(value: unknown, schema: PipelineJsonSchema): void;

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

interface EvmWalletCall {
    to: string;
    data?: string;
    value?: string;
}
type WalletTransactionResult = string | {
    hash?: string;
    transactionHash?: string;
} | {
    hashes?: string[];
    transactionHashes?: string[];
};
interface EvmWalletAdapter {
    address: string;
    chainId?: number | (() => number | undefined);
    sendCalls?: (input: {
        chainId: number;
        calls: EvmWalletCall[];
    }) => Promise<WalletTransactionResult>;
    sendTransaction?: (input: EvmWalletCall & {
        chainId: number;
    }) => Promise<WalletTransactionResult>;
    signMessage?: (input: {
        message: string;
        chainId?: number;
    }) => Promise<string | {
        signature: string;
    }>;
    signTypedData?: (input: {
        typedData: Record<string, unknown>;
        chainId?: number;
    }) => Promise<string | {
        signature: string;
    }>;
    switchChain?: (chainId: number) => Promise<unknown>;
}
interface SvmWalletAdapter {
    address: string;
    cluster?: string | (() => string | undefined);
    signTransaction?: (input: {
        transactionBase64: string;
        cluster?: string;
    }) => Promise<string | {
        signedTransaction?: string;
        signature?: string;
    }>;
    sendTransaction?: (input: {
        transactionBase64: string;
        cluster?: string;
    }) => Promise<WalletTransactionResult>;
    signAndSendTransaction?: (input: {
        transactionBase64: string;
        cluster?: string;
    }) => Promise<string | {
        signature?: string;
        signedTransaction?: string;
    }>;
    signMessage?: (input: {
        messageBase64: string;
        cluster?: string;
    }) => Promise<string | {
        signature: string;
    }>;
    switchCluster?: (cluster: string) => Promise<unknown>;
}
interface AomiWalletAdapter {
    evm?: EvmWalletAdapter;
    svm?: SvmWalletAdapter;
}
interface WalletControllerEvents extends Record<string, unknown> {
    action: Action;
    resolved: {
        action: Action;
        result: ActionResult;
    };
    rejected: {
        action: Action;
        error: unknown;
    };
}
/** Executes the request nested in a canonical Action. */
declare class WalletController extends TypedEventEmitter<WalletControllerEvents> {
    readonly wallet?: AomiWalletAdapter | undefined;
    constructor(wallet?: AomiWalletAdapter | undefined);
    canHandle(action: Action): boolean;
    execute(action: Action): Promise<ActionResult>;
    userState(): Record<string, unknown> | undefined;
    private executeRequest;
    private executeEvm;
    private executeSvm;
    private executeSigning;
    private evmChainId;
    private svmCluster;
    private switchSvmCluster;
}

type SendResult = {
    messages: AomiMessage[];
    title?: string;
};
type SessionOptions = {
    sessionId?: string;
    app?: string;
    model?: string | null;
    applicationId?: number | string | null;
    userState?: UserState$1;
    clientType?: AomiClientType;
    clientId?: string;
    pollIntervalMs?: number;
    logger?: {
        debug: (...args: unknown[]) => void;
    };
};
type SessionRuntimeOptions = {
    app: string;
    model?: string | null;
    applicationId?: number | string | null;
    clientId?: string;
    userState?: UserState$1;
};
type MessageEvent = Extract<Event, {
    type: "message";
}>;
type TurnEvent = Extract<Event, {
    type: "turn_state_changed";
}>;
type ToolEvent = Extract<Event, {
    type: "tool_update" | "tool_complete";
}>;
type TaskEvent = Extract<Event, {
    type: "task_started" | "task_activity" | "task_completed";
}>;
type TitleEvent = Extract<Event, {
    type: "title_changed";
}>;
type ErrorEvent = Extract<Event, {
    type: "error";
}>;
type SessionEventMap = {
    event: Event;
    action: Action;
    actions_changed: Action[];
    message: MessageEvent;
    messages: AomiMessage[];
    turn_state_changed: TurnEvent;
    tool_update: ToolEvent;
    tool_complete: ToolEvent;
    task_started: TaskEvent;
    task_activity: TaskEvent;
    task_completed: TaskEvent;
    title_changed: TitleEvent;
    system_error: ErrorEvent;
    user_state_updated: UserState$1;
    processing_start: undefined;
    processing_end: undefined;
    backend_idle: undefined;
    error: {
        error: unknown;
    };
    "*": {
        type: string;
        payload: unknown;
    };
};

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

declare function aaModeFromExecutionKind(executionKind: string | undefined): "4337" | "7702" | "none" | undefined;

/** One Agent session reduced from its single ordered Event stream. */
declare class ClientSession extends TypedEventEmitter<SessionEventMap> {
    readonly client: AomiClient;
    readonly sessionId: string;
    private app;
    private model?;
    private applicationId?;
    private userState?;
    private clientId;
    private pollIntervalMs;
    private logger?;
    private cursor?;
    private turnId?;
    private turnState?;
    private readonly actions;
    private startOperation?;
    private pollTimer;
    private pollingActive;
    private pollInFlight;
    private pollFailureCount;
    private _isProcessing;
    private _messages;
    private _title?;
    private closed;
    private pendingResolve;
    constructor(clientOrOptions: AomiClient | AomiClientOptions, sessionOptions?: SessionOptions);
    send(message: string): Promise<SendResult>;
    sendAsync(message: string): Promise<EventPage>;
    respondToAction(actionId: string, result: ActionResult): Promise<Action>;
    rejectAction(actionId: string, reason?: string): Promise<Action>;
    interrupt(): Promise<void>;
    close(): void;
    getMessages(): AomiMessage[];
    getTitle(): string | undefined;
    getUserState(): UserState$1 | undefined;
    getPendingActions(): Action[];
    getActions(): Action[];
    getTurnState(): TurnState | undefined;
    getTurnId(): string | undefined;
    getIsProcessing(): boolean;
    getIsPolling(): boolean;
    syncRuntimeOptions(options: SessionRuntimeOptions): void;
    resolveUserState(userState: UserState$1, opts?: {
        skipEmit?: boolean;
    }): void;
    setClientType(clientType: AomiClientType): void;
    addExtValue(key: string, value: unknown): void;
    removeExtValue(key: string): void;
    resolveWallet(address: string, chainId?: number): void;
    sync(): Promise<EventPage>;
    fetchCurrentState(): Promise<void>;
    startPolling(): void;
    stopPolling(): void;
    private submit;
    private fetchPage;
    private applyEventPage;
    private applyMessage;
    private applyAction;
    private pendingAction;
    private pollTick;
    private beginProcessing;
    private finishProcessing;
    private isTerminal;
    private result;
    private resolvePending;
    private currentPollInterval;
    private schedulePoll;
    private handleVisibilityChange;
    private assertOpen;
}

interface AgentRunOptions extends Omit<SessionOptions, "userState" | "sessionId"> {
    sessionId?: string;
    userState?: UserState$1;
    /** Set false to expose Actions without executing the configured wallet. */
    autoWallet?: boolean;
}
interface AgentRunResult extends SendResult {
    sessionId: string;
    actions: Action[];
}
interface AgentRunEventMap extends Record<string, unknown> {
    action: Action;
    completed: AgentRunResult;
    error: {
        error: unknown;
    };
}
/** One stateful Agent turn. It is both event-driven and Promise-like. */
declare class AgentRun extends TypedEventEmitter<AgentRunEventMap> implements PromiseLike<AgentRunResult> {
    private readonly wallet;
    readonly session: ClientSession;
    private readonly completion;
    private readonly actions;
    private readonly processingActions;
    constructor(client: AomiClient, prompt: string, wallet: WalletController, options?: AgentRunOptions);
    result(): Promise<AgentRunResult>;
    then<TResult1 = AgentRunResult, TResult2 = never>(onfulfilled?: ((value: AgentRunResult) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2>;
    interrupt(): Promise<void>;
    respond(actionId: string, result: ActionResult): Promise<Action>;
    reject(actionId: string, reason?: string): Promise<Action>;
    private receiveAction;
}
declare class AomiAgent {
    readonly raw: AomiClient["agent"];
    private readonly client;
    private readonly wallet;
    constructor(raw: AomiClient["agent"], client: AomiClient, wallet: WalletController);
    run(prompt: string, options?: AgentRunOptions): AgentRun;
}

declare class EvmStaged {
    readonly raw: EvmStagedBuild;
    private readonly transport;
    private readonly wallet;
    constructor(raw: EvmStagedBuild, transport: EvmPipelineTransport, wallet: WalletController);
    get version(): 1;
    get status(): "staged";
    get actions(): EvmPresentedAction[];
    get digest(): string;
    simulate(): Promise<EvmBuild>;
    toJSON(): EvmStagedBuild;
}
declare class EvmBuild {
    readonly raw: EvmSimulatedBuild;
    private readonly transport;
    private readonly wallet;
    constructor(raw: EvmSimulatedBuild, transport: EvmPipelineTransport, wallet: WalletController);
    get version(): 1;
    get status(): "simulated";
    get actions(): EvmPresentedAction[];
    get summary(): PipelineActionSummary | undefined;
    get simulation(): PipelineSimulation;
    get digest(): string;
    commit(options?: PipelineCommitOptions): Promise<EvmCommitResult>;
    toJSON(): EvmSimulatedBuild;
}
declare class SvmStaged {
    readonly raw: SvmStagedBuild;
    private readonly transport;
    private readonly wallet;
    constructor(raw: SvmStagedBuild, transport: SvmPipelineTransport, wallet: WalletController);
    get version(): 1;
    get status(): "staged";
    get actions(): SvmPresentedAction[];
    get digest(): string;
    simulate(): Promise<SvmBuild>;
    toJSON(): SvmStagedBuild;
}
declare class SvmBuild {
    readonly raw: SvmSimulatedBuild;
    private readonly transport;
    private readonly wallet;
    constructor(raw: SvmSimulatedBuild, transport: SvmPipelineTransport, wallet: WalletController);
    get version(): 1;
    get status(): "simulated";
    get actions(): SvmPresentedAction[];
    get summary(): PipelineActionSummary | undefined;
    get simulation(): PipelineSimulation;
    get digest(): string;
    commit(options?: PipelineCommitOptions): Promise<SvmCommitResult>;
    toJSON(): SvmSimulatedBuild;
}

declare class AomiEvmPipeline {
    readonly raw: EvmPipelineTransport;
    private readonly wallet;
    constructor(raw: EvmPipelineTransport, wallet: WalletController);
    build(input: PipelineOperationBuildInput | EvmDirectInput): Promise<EvmBuild>;
    stage(input: EvmStageInput | EvmDirectInput): Promise<EvmStaged>;
    simulate(build: EvmStaged | EvmStagedBuild): Promise<EvmBuild>;
    commit(build: EvmBuild | EvmSimulatedBuild, options?: PipelineCommitOptions): Promise<EvmCommitResult>;
}
declare class AomiSvmPipeline {
    readonly raw: SvmPipelineTransport;
    private readonly wallet;
    constructor(raw: SvmPipelineTransport, wallet: WalletController);
    build(input: PipelineOperationBuildInput | SvmDirectInput): Promise<SvmBuild>;
    stage(input: SvmStageInput): Promise<SvmStaged>;
    simulate(build: SvmStaged | SvmStagedBuild): Promise<SvmBuild>;
    commit(build: SvmBuild | SvmSimulatedBuild, options?: PipelineCommitOptions): Promise<SvmCommitResult>;
}
interface AomiOperationBuildOptions {
    /** Override Catalog metadata when integrating an older descriptor. */
    chainFamily?: "evm" | "svm";
}
declare class AomiPipelineOperationScope {
    readonly raw: PipelineOperationTransport;
    private readonly evm;
    private readonly svm;
    constructor(raw: PipelineOperationTransport, evm: AomiEvmPipeline, svm: AomiSvmPipeline);
    directory(): Promise<PipelineDirectory>;
    operations(): Promise<PipelineDirectory>;
    operation(name: string): Promise<PipelineOperationDescriptor>;
    invoke<T = unknown>(name: string, args: Record<string, unknown>, options?: PipelineInvokeOptions): Promise<T>;
    build(name: string, args: Record<string, unknown>, options?: AomiOperationBuildOptions): Promise<EvmBuild | SvmBuild>;
}
declare class AomiPipelineSkillScope extends AomiPipelineOperationScope {
    readonly skillRaw: PipelineSkillTransport;
    constructor(skillRaw: PipelineSkillTransport, evm: AomiEvmPipeline, svm: AomiSvmPipeline);
    instructions(): Promise<string>;
}
declare class AomiPipeline {
    readonly raw: PipelineTransport;
    readonly evm: AomiEvmPipeline;
    readonly svm: AomiSvmPipeline;
    constructor(raw: PipelineTransport, wallet: WalletController);
    app(name: string): AomiPipelineOperationScope;
    skill(name: string): AomiPipelineSkillScope;
}

interface AomiOptions extends AomiClientOptions {
    wallet?: AomiWalletAdapter;
}
/** Product-oriented SDK facade. Use `raw` for wire-close protocol control. */
declare class Aomi {
    readonly raw: AomiClient;
    readonly pipeline: AomiPipeline;
    readonly agent: AomiAgent;
    readonly wallet: WalletController;
    constructor(options: AomiOptions);
}

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

export { type AACallPayload, type AAMode, type AASponsorship, type AAWalletCall, ALCHEMY_CHAIN_SLUGS, AOMI_TASK_EVENT_TYPES, type AccountBearerProvider, type AccountBearerProviderOptions, type AccountCredentialProvider, AccountCredentialUnavailableError, type AccountSessionExchangeResponse, type Action, type ActionRequest, type ActionResult, AgentApiError, AgentRun, type AgentRunEventMap, type AgentRunOptions, type AgentRunResult, type Session as AgentSession, AgentTransport, type UserState as AgentUserState, Aomi, type AomiAccessApproval, type AomiAccountProfile, type AomiAccountResponse, AomiAgent, type AomiAppDescriptor, type AomiAuthIdentity, type AomiAuthPurpose, type AomiAuthorizationChallenge, type AomiAuthorizationPermit, type AomiAuthorizationState, type AomiClearSecretsResponse, AomiClient, type AomiClientOptions, type AomiClientType, type AomiCreateApprovalRequest, type AomiDeleteSecretResponse, type AomiEnsureBoundResult, AomiEvmPipeline, type AomiHttpMethod, type AomiIdentityWallet, type AomiIngestSecretsResponse, type AomiListSecretsResponse, type AomiMessage, type AomiOAuthResource, type AomiOAuthTokenProvider, type AomiOAuthTokenRequest, type AomiOAuthTokenSet, type AomiOperationBuildOptions, type AomiOptions, AomiPipeline, AomiPipelineOperationScope, AomiPipelineSkillScope, type AomiPlatformFilter, type AomiRequestOptions, type AomiRequestQueryValue, type AomiSecretSlot, type AomiSimulateFee, type AomiSimulateResponse, AomiSvmPipeline, type AomiTaskActivityEvent, type AomiTaskActivityKind, type AomiTaskCompletedEvent, type AomiTaskEvent, type AomiTaskEventType, type AomiTaskStartedEvent, type AomiTaskStatus, type AomiUsageStats, type AomiUser, type AomiWalletAdapter, type AomiWalletFamily, type ApplicationId, type AtomicBatchArgs, type AuthorizationPoster, type BetterAuthAccountTokenSourceOptions, type BetterAuthTokenResponse, CHAINS_BY_ID, CHAIN_NAMES, CLIENT_TYPE_TS_CLI, CLIENT_TYPE_WEB_UI, type ChainInfo, type ErrorEvent$1 as ErrorEvent, type Event, type EventPage, EvmBuild, type EvmCall, type EvmCallInput, type EvmCommitResult, type EvmDirectInput, EvmPipelineTransport, type EvmPresentedAction, type EvmSimulatedBuild, type EvmStageActionInput, type EvmStageInput, EvmStaged, type EvmStagedAction, type EvmStagedBuild, type EvmWalletAdapter, type EvmWalletCall, type ExecuteWalletCallsParams, type ExecutionResult, type GetAccountBearer, type GuestSessionProvider, type InterruptIntent, type Logger, MAX_AUTO_FEE_WEI, type MessageEvent$1 as MessageEvent, type NativeWalletExecutionPolicy, type NativeWalletSponsorship, type NormalizedSimulatedFee, type NormalizedSolanaWalletRequest, type OwnedUserState, type PartialWalletExecution, PartialWalletExecutionError, type PipelineActionSummary, PipelineApiError, PipelineAppsTransport, type PipelineBalanceChange, type PipelineCommitOptions, type PipelineDirectory, type PipelineDirectoryEntry, type PipelineDirectoryEntryKind, type PipelineFeeEstimate, type PipelineFilesystemResource, type PipelineGuardResult, type PipelineInvokeOptions, type PipelineJsonSchema, type PipelineOperationBuildInput, type PipelineOperationDescriptor, type PipelineOperationInvocation, PipelineOperationTransport, PipelineSchemaError, type PipelineSimulation, type PipelineSimulationStatus, PipelineSkillTransport, PipelineSkillsTransport, type PipelineTransactionReceipt, PipelineTransport, type ProviderCredential, type RespondToActionIntent, SUPPORTED_CHAINS, SUPPORTED_CHAIN_IDS, type SendResult, ClientSession as Session, type SessionEventMap, type SessionOptions, type SessionPage, type SiwsChainId, type SiwsIntent, type SiwsWidgetSessionSigner, type SponsorshipPaymasterServiceContext, type StartTurnIntent, type SvmAccountMeta, SvmBuild, type SvmCommitResult, type SvmDirectInput, type SvmInstruction, SvmPipelineTransport, type SvmPresentedAction, type SvmSimulatedBuild, type SvmStageInput, SvmStaged, type SvmStagedAction, type SvmStagedBuild, type SvmTransaction, type SvmWalletAdapter, type TaskEvent$1 as TaskEvent, type TitleEvent$1 as TitleEvent, type ToolEvent$1 as ToolEvent, type TurnState, type TurnStateChangedEvent, TypedEventEmitter, UserState$1 as UserState, type UserStateAAMode, type UserStateAuthMethod, type UserStateWalletProvider, type ViemSignMessageArgs, type ViemSignTypedDataArgs, type WalletAtomicCapability, type WalletCapabilities, WalletController, type WalletControllerEvents, type WalletEip712Payload, type WalletSolanaSignMessagePayload, type WalletSolanaSignPayload, type WalletTransactionResult, type WalletTxAaPreference, type WalletTxCallPayload, type WalletTxPayload, type WidgetAuthAdapter, type WidgetAuthSession, WidgetChallengeBindingError, type WidgetSession, type WidgetSessionProvider, type WidgetSessionSigner, aaModeFromExecutionKind, appIdentityKey, appendFeeCallToPayload, arcTestnet, authorizationChallenge, authorizationCommit, buildFeeAAWalletCall, buildSiwsMessage, createAccountBearerProvider, createGuestSessionProvider, createOAuthTokenProvider, createProviderCredentialAdapter, createSiweWidgetAuthAdapter, createSiwsWidgetAuthAdapter, createWidgetSessionProvider, ensureSvmWalletBound, ensureSvmWalletBoundVia, executeWalletCalls, handlePaymentChallenges, isAomiTaskEventType, isUnboundWalletError, megaeth, monad, monadTestnet, normalizeAppDescriptor, normalizeEip712Payload, normalizeSimulatedFee, normalizeSolanaCluster, normalizeSolanaSignMessagePayload, normalizeSolanaSignPayload, normalizeSolanaWalletRequest, normalizeTxPayload, parseAomiTaskEvent, parseChainId, partialWalletExecution, posterFromClient, robinhood, safeEnv, secretNamesFrom, toAAWalletCall, toAAWalletCalls, toViemSignMessageArgs, toViemSignTypedDataArgs, validatePipelineArguments, wrapFetchWithPaymentChallenges };
