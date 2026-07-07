import type { LucideIcon } from "lucide-react";
import type { ElementType } from "react";

export type ToolConfidence = "high" | "medium" | "fallback";

export type ToolChip = {
  label: string;
  dot?: string;
  icon?: ElementType;
};

export type InterpretedToolStep = {
  icon: LucideIcon;
  title: string;
  chips: ToolChip[];
  confidence: ToolConfidence;
  rawLabel: string;
};

export type ToolStepInput = {
  toolName: string;
  argsText?: string;
  result?: unknown;
};

export type FactKind =
  | "action"
  | "address"
  | "amount"
  | "block"
  | "chain"
  | "code"
  | "count"
  | "decoded"
  | "gas"
  | "selector"
  | "skill"
  | "sourceHost"
  | "status"
  | "token"
  | "txId";

export type FactRole =
  | "contract"
  | "decimals"
  | "error"
  | "from"
  | "metadata"
  | "native"
  | "null"
  | "owner"
  | "primary"
  | "recipient"
  | "results"
  | "secondary"
  | "spender"
  | "to"
  | "tx";

export type FactSource = "args" | "decoded" | "label" | "result";

export type ToolFact = {
  kind: FactKind;
  role?: FactRole;
  value: string;
  label?: string;
  source: FactSource;
};

export type ToolOperation = {
  id: string;
  facts: ToolFact[];
  confidence: ToolConfidence;
  rawLabel: string;
};

export type ToolContext = {
  rawLabel: string;
  parsedArgs: unknown;
  result: unknown;
  resultRecord: Record<string, unknown> | null;
};

export type ToolMatcher = (ctx: ToolContext) => ToolOperation | null;
