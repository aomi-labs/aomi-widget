import type { components } from "../generated/agent-v1/types";
import type { WalletRequest, WalletRequestResult } from "../session/types";

type Schemas = components["schemas"];

/** JSON Schema as returned by the live Pipeline Catalog. */
export type PipelineJsonSchema = boolean | Record<string, unknown>;

export type PipelineDirectoryEntryKind = "directory" | "operation" | "document";

export interface PipelineDirectoryEntry {
  name: string;
  kind: PipelineDirectoryEntryKind;
  href: string;
  description?: string;
}

export interface PipelineDirectory {
  kind: "directory";
  path: string;
  entries: PipelineDirectoryEntry[];
}

export interface PipelineOperationDescriptor {
  kind: "operation";
  name: string;
  description: string;
  method: "POST";
  href: string;
  inputSchema: PipelineJsonSchema;
  outputSchema?: PipelineJsonSchema;
  chainFamily?: "evm" | "svm";
}

export interface PipelineDocument {
  kind: "document";
  name: string;
  href: string;
  mediaType: string;
  content: string;
}

export type PipelineFilesystemResource =
  | PipelineDirectory
  | PipelineOperationDescriptor
  | PipelineDocument;

export interface PipelineOperationInvocation<
  Arguments extends Record<string, unknown> = Record<string, unknown>,
> {
  operation: string;
  arguments: Arguments;
}

export type PipelineOperationBuildInput<
  Arguments extends Record<string, unknown> = Record<string, unknown>,
> =
  | PipelineOperationInvocation<Arguments>
  | { operations: PipelineOperationInvocation<Arguments>[] };

export interface PipelineInvokeOptions {
  /** Validate arguments against the live operation descriptor before POSTing. */
  validate?: boolean;
  idempotencyKey?: string;
  paymentSignature?: string;
}

export interface PipelineCommitOptions {
  /** Defaults to the portable Build digest, making repeated commits stable. */
  idempotencyKey?: string;
  paymentSignature?: string;
}

export type PipelineSimulationStatus = "passed" | "failed";

export interface PipelineBalanceChange {
  account?: string;
  asset: string;
  amount: string;
  direction?: "in" | "out";
  symbol?: string;
  decimals?: number;
  chainId?: number;
  cluster?: string;
}

export interface PipelineFeeEstimate {
  asset: string;
  amount: string;
  symbol?: string;
  usdValue?: string;
  kind?: string;
}

export interface PipelineGuardResult {
  name: string;
  status: "passed" | "failed" | "warning";
  message?: string;
}

export interface PipelineSimulation {
  status: PipelineSimulationStatus;
  balanceChanges: PipelineBalanceChange[];
  fees: PipelineFeeEstimate[];
  warnings: string[];
  guards?: PipelineGuardResult[];
  gas?: Record<string, unknown>;
  logs?: unknown[];
}

export interface PipelineActionSummary {
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

export interface EvmCallInput {
  to: `0x${string}`;
  data?: `0x${string}`;
  /** bigint is accepted at the SDK boundary and encoded as a decimal string. */
  value?: bigint | string;
  from?: `0x${string}`;
  gas?: bigint | string;
  description?: string;
}

export interface EvmCall extends Omit<EvmCallInput, "value" | "gas"> {
  value?: string;
  gas?: string;
}

export interface EvmStageActionInput {
  chainId: number;
  calls: EvmCallInput[];
  description?: string;
}

export interface EvmStageInput {
  actions: EvmStageActionInput[];
}

export interface EvmDirectInput {
  chainId: number;
  calls: EvmCallInput[];
  description?: string;
}

export interface EvmStagedAction {
  id: string;
  chainFamily?: "evm";
  kind?: "calls";
  status?: string;
  chainId: number;
  calls: EvmCall[];
  description?: string;
}

export type EvmPresentedAction = EvmStagedAction & {
  chainFamily: "evm";
  kind: "calls";
};

export interface EvmStagedBuild {
  version: 1;
  status: "staged";
  actions: EvmStagedAction[];
  digest: string;
}

export interface EvmSimulatedBuild {
  version: 1;
  status: "simulated";
  actions: EvmStagedAction[];
  simulation: PipelineSimulation;
  summary?: PipelineActionSummary;
  digest: string;
}

export interface PipelineTransactionReceipt {
  id?: string;
  transactionId: string;
  status?: "submitted" | "confirmed" | "failed";
  chainId?: number;
  cluster?: string;
  blockNumber?: number | string;
}

export interface EvmCommitResult {
  version: 1;
  status: "committed" | "submitted" | "awaiting_wallet";
  digest: string;
  receipts?: PipelineTransactionReceipt[];
  walletRequest?: Extract<WalletRequest, { kind: "transaction" | "signing" }>;
  /** Present on high-level results when the configured wallet handled a request. */
  walletResult?: WalletRequestResult;
}

export interface SvmAccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface SvmInstruction {
  programId: string;
  accounts: SvmAccountMeta[];
  /** Base64 by default; an explicit encoding keeps byte semantics unambiguous. */
  data: string;
  encoding?: "base64" | "base58";
}

export interface SvmTransaction {
  transaction: string;
  encoding?: "base64";
  cluster?: string;
  feePayer?: string;
}

export type SvmStageInput =
  | {
      kind: "instructions";
      instructions: SvmInstruction[];
      cluster?: string;
      feePayer?: string;
    }
  | {
      kind: "transaction";
      transaction: SvmTransaction;
    };

export type SvmDirectInput = SvmStageInput;

export type SvmStagedAction =
  | {
      id: string;
      chainFamily?: "svm";
      kind: "instructions";
      status?: string;
      instructions: SvmInstruction[];
      cluster?: string;
      description?: string;
    }
  | {
      id: string;
      chainFamily?: "svm";
      kind: "transaction";
      status?: string;
      transaction: SvmTransaction;
      cluster?: string;
      description?: string;
    };

export type SvmPresentedAction = SvmStagedAction & { chainFamily: "svm" };

export interface SvmStagedBuild {
  version: 1;
  status: "staged";
  actions: SvmStagedAction[];
  digest: string;
}

export interface SvmSimulatedBuild {
  version: 1;
  status: "simulated";
  actions: SvmStagedAction[];
  simulation: PipelineSimulation;
  summary?: PipelineActionSummary;
  digest: string;
}

export interface SvmCommitResult {
  version: 1;
  status: "committed" | "submitted" | "awaiting_wallet";
  digest: string;
  receipts?: PipelineTransactionReceipt[];
  walletRequest?: Extract<
    WalletRequest,
    { kind: "signing" | "solana_send" | "solana_sign_and_send" }
  >;
  /** Present on high-level results when the configured wallet handled a request. */
  walletResult?: WalletRequestResult;
}

export interface AomiSigningAction {
  id: string;
  chainFamily: "evm" | "svm";
  kind: "signing";
  status: string;
  description?: string;
  signer: string;
  chainId?: number;
  cluster?: string;
}

export type AomiAction =
  | EvmPresentedAction
  | SvmPresentedAction
  | AomiSigningAction;

// ---------------------------------------------------------------------------
// Deprecated flat Pipeline compatibility contract
// ---------------------------------------------------------------------------

export type PipelineCatalogResponse =
  | Schemas["PipelineAppList"]
  | Schemas["PipelineAppDescription"]
  | Schemas["PipelineToolList"]
  | Schemas["PipelineToolDescription"]
  | Schemas["PipelineSkillList"]
  | Schemas["PipelineSkill"]
  | Schemas["PipelineSearchResults"];
export type PipelineExecutionResponse =
  | Schemas["PipelineToolCallResponse"]
  | Schemas["PipelineRunResponse"];
export type PipelineAction = Schemas["PipelineAction"];
export type PipelineErrorBody = Schemas["ErrorEnvelope"];
export type PipelineResource = Record<string, unknown>;

export interface PipelineListOptions {
  /** Result limit, bounded by the selected catalog operation. */
  limit?: number;
}

export interface PipelineToolListOptions extends PipelineListOptions {
  app?: string;
  namespace?: string;
}

export interface PipelineSearchOptions extends PipelineListOptions {
  q?: string;
}

export interface PipelineToolSearchOptions extends PipelineSearchOptions {
  app?: string;
}

/** Headers binding one fail-closed, at-most-once compatibility execution. */
export interface PipelineExecutionOptions {
  idempotencyKey: string;
  paymentSignature?: string;
}

export type PipelineAppsResponse = Schemas["PipelineAppList"];
export type PipelineAppResponse = Schemas["PipelineAppDescription"];
export type PipelineToolsResponse = Schemas["PipelineToolList"];
export type PipelineToolResponse = Schemas["PipelineToolDescription"];
export type PipelineSkillsResponse = Schemas["PipelineSkillList"];
export type PipelineSearchResponse = Schemas["PipelineSearchResults"];

type GeneratedPipelineToolCallRequest = Schemas["PipelineToolCallRequest"];

/** @deprecated Use chain lifecycle or scoped operation methods. */
export type PipelineToolCallRequest = Omit<
  GeneratedPipelineToolCallRequest,
  "skills"
> & { skills?: string[] };

type GeneratedPipelineRunRequest = Schemas["PipelineRunRequest"];
type PipelineRunRequestBase = Omit<
  GeneratedPipelineRunRequest,
  "program" | "plan" | "skills"
> & { skills?: string[] };

/** @deprecated Use chain lifecycle or scoped operation methods. */
export type PipelineRunRequest = PipelineRunRequestBase &
  (
    | { program: string; plan?: never }
    | { program?: never; plan: Record<string, unknown> }
  );
