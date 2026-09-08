import type { components } from "../generated/agent-v1/types";

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

export type PipelineSimulation = Schemas["PipelineSimulation"];
export type PipelineSimulationStatus = PipelineSimulation["status"];
export type PipelineBalanceChange = Schemas["PipelineBalanceChange"];
export type PipelineFeeEstimate = Schemas["PipelineFeeEstimate"];
export type PipelineGuardResult = Schemas["PipelineGuardResult"];
export type PipelineGasEstimate = Schemas["PipelineGasEstimate"];
export type PipelineLog = Schemas["PipelineLog"];

export type PipelineActionSummary = Schemas["PipelineBuild"]["summary"];

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

// A Build is a server-sealed value, not a wallet Action. Preserve its native
// action records, origin, expiry and attestation without fabricating a second
// presentation envelope. Execution requests are returned separately at commit.
export type EvmStagedBuild = Schemas["PipelineBuild"] & {
  status: "staged";
  actions: Schemas["AssembledEvmTransaction"][];
};
export type EvmSimulatedBuild = Schemas["PipelineBuild"] & {
  status: "simulated";
  actions: Schemas["AssembledEvmTransaction"][];
  simulation: PipelineSimulation;
};
export type EvmCommitResult = Schemas["PipelineEvmCommitResult"];

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

export type SvmStagedBuild = Schemas["PipelineBuild"] & { status: "staged" };
export type SvmSimulatedBuild = Schemas["PipelineBuild"] & {
  status: "simulated";
  simulation: PipelineSimulation;
};
export type SvmCommitResult = Schemas["PipelineSvmCommitResult"];
export type PipelineErrorBody = Schemas["ErrorEnvelope"];
