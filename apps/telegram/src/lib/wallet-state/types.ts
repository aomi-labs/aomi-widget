export type WalletConnectionSource = "mini_app" | "server_wc";

export interface TxCall {
  to: string;
  value: string;
  data?: string;
  chainId: number;
  pending_tx_id?: number;
}

export type WalletPresence = "disconnected" | "connecting" | "connected";

export type OperationKind =
  | "connect"
  | "switch_network"
  | "sign_tx"
  | "sign_eip712";

export type OperationStatus =
  | "awaiting_wallet"
  | "processing"
  | "succeeded"
  | "failed"
  | "rejected"
  | "timed_out"
  | "canceled";

export interface ConnectOperationMetadata {
  source: WalletConnectionSource;
}

export interface SwitchNetworkOperationMetadata {
  sessionKey: string;
  chainId: number;
  address?: string;
}

export interface SignTxOperationMetadata {
  sessionKey: string;
  calls: TxCall[];
  pendingTxIds?: number[];
  txHash?: string;
  txHashes?: string[];
  aaRequestedMode?: string;
  aaResolvedMode?: string;
  aaFallbackReason?: string;
  executionKind?: string;
  batched?: boolean;
  sponsored?: boolean;
  SmartAccount4337?: string;
  Delegation7702?: string;
  attemptCount: number;
}

export interface SignEip712OperationMetadata {
  sessionKey: string;
  typedData?: Record<string, unknown>;
  nonTypedData?: string;
  description: string;
  pendingEip712Id?: number;
  signature?: string;
  attemptCount: number;
}

export type OperationMetadata =
  | ConnectOperationMetadata
  | SwitchNetworkOperationMetadata
  | SignTxOperationMetadata
  | SignEip712OperationMetadata;

export interface WalletOperation {
  operationId: string;
  kind: OperationKind;
  status: OperationStatus;
  startedAt: number;
  expiresAt: number;
  errorCode?: string;
  errorMessage?: string;
  metadata: OperationMetadata;
}

export interface UserWalletState {
  userId: string;
  presence: WalletPresence;
  address?: string;
  chainId?: number | null;
  svmAddress?: string;
  svmCluster?: string | null;
  walletProvider?: string;
  providerLabel?: string;
  source?: WalletConnectionSource;
  activeOperation?: WalletOperation;
  label: string;
  updatedAt: number;
}

export interface OperationLookupResult {
  userId: string;
  state: UserWalletState;
  operation: WalletOperation;
}
