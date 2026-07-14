import {
  amountFact,
  asRecord,
  asString,
  chainFactFromRecord,
  tokenFact,
  uniqueFacts,
} from "../normalize";
import type { ToolFact, ToolMatcher, ToolOperation } from "../types";

const op = (
  id: string,
  rawLabel: string,
  facts: Array<ToolFact | null>,
): ToolOperation => ({
  id,
  facts: uniqueFacts(facts.filter((fact): fact is ToolFact => fact != null)),
  confidence: "high",
  rawLabel,
});

const displayAmount = (value: unknown): string | undefined =>
  asString(asRecord(value)?.display);

const amountDisplayFact = (
  value: unknown,
  role: "primary" | "secondary",
): ToolFact | null => {
  const fact = amountFact(displayAmount(value));
  return fact ? { ...fact, role } : null;
};

const amountTextFact = (
  value: unknown,
  role: "primary" | "secondary",
): ToolFact | null => {
  const fact = amountFact(asString(value));
  return fact ? { ...fact, role } : null;
};

const tokenSymbol = (value: unknown): string | undefined =>
  asString(asRecord(value)?.symbol);

const tokenPairFact = (
  fromToken: unknown,
  toToken: unknown,
): ToolFact | null => {
  const fromSymbol = tokenSymbol(fromToken);
  const toSymbol = tokenSymbol(toToken);
  if (!fromSymbol || !toSymbol) return null;
  return {
    kind: "token",
    role: "primary",
    value: `${fromSymbol} -> ${toSymbol}`,
    source: "result",
  };
};

const lifiFact = (): ToolFact => ({
  kind: "sourceHost",
  value: "Lifi",
  source: "result",
});

export const matchLifiQuote: ToolMatcher = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  const fromToken = asRecord(resultRecord.from_token);
  const toToken = asRecord(resultRecord.to_token);
  const estimate = asRecord(resultRecord.estimate);
  if (!asString(resultRecord.quote_id) || !fromToken || !toToken || !estimate) {
    return null;
  }

  return op("lifi.quote", rawLabel, [
    chainFactFromRecord(resultRecord),
    amountDisplayFact(resultRecord.from_amount, "primary"),
    amountTextFact(estimate.to_amount_display, "secondary"),
    tokenPairFact(fromToken, toToken),
  ]);
};

export const matchLifiApproval: ToolMatcher = ({ rawLabel, resultRecord }) => {
  if (!resultRecord || !asString(resultRecord.quote_id)) return null;
  if (!("approval_required" in resultRecord)) return null;

  const approval = asRecord(resultRecord.approval);
  const token = asRecord(approval?.token) ?? asRecord(resultRecord.token);
  if (!token) return null;

  return op("lifi.approval", rawLabel, [
    chainFactFromRecord(resultRecord) ?? chainFactFromRecord(token),
    tokenFact(token.symbol),
    amountDisplayFact(approval?.amount, "primary"),
  ]);
};

export const matchLifiSwapPrep: ToolMatcher = ({ rawLabel, resultRecord }) => {
  if (!resultRecord || !asString(resultRecord.quote_id)) return null;
  const stageTx = asRecord(resultRecord.stage_tx);
  if (stageTx?.kind !== "lifi_swap") return null;

  const estimate = asRecord(resultRecord.estimate);
  return op("lifi.swap.prepare", rawLabel, [
    chainFactFromRecord(resultRecord),
    lifiFact(),
    amountDisplayFact(resultRecord.from_amount, "primary"),
    amountTextFact(estimate?.to_amount_display, "secondary"),
    tokenPairFact(resultRecord.from_token, resultRecord.to_token),
  ]);
};
