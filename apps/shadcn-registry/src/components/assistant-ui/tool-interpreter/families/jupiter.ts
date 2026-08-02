import { amountFact, asRecord, asString, uniqueFacts } from "../normalize";
import type { ToolFact, ToolMatcher } from "../types";
import { svmClusterFact } from "./svm";

const amountDisplayFact = (
  value: unknown,
  role: "primary" | "secondary",
): ToolFact | null => {
  const display = asString(asRecord(value)?.display);
  const fact = amountFact(display);
  return fact ? { ...fact, role } : null;
};

const tokenPairFact = (quote: Record<string, unknown>): ToolFact | null => {
  const input = asRecord(quote.input_token);
  const output = asRecord(quote.output_token);
  const inputSymbol = asString(input?.symbol);
  const outputSymbol = asString(output?.symbol);
  if (!inputSymbol || !outputSymbol) return null;
  return {
    kind: "token",
    role: "primary",
    value: `${inputSymbol} -> ${outputSymbol}`,
    label: `${inputSymbol} → ${outputSymbol}`,
    source: "result",
  };
};

export const matchJupiterSwapPrep: ToolMatcher = ({
  rawLabel,
  resultRecord,
}) => {
  if (!resultRecord) return null;
  const quote = asRecord(resultRecord.quote);
  if (!quote || !asRecord(quote.input_token) || !asRecord(quote.output_token)) {
    return null;
  }
  if (!("ix_ids" in resultRecord || "instruction_count" in resultRecord)) {
    return null;
  }

  const facts = [
    svmClusterFact(resultRecord.cluster),
    amountDisplayFact(quote.input, "primary"),
    amountDisplayFact(quote.expected_output, "secondary"),
    tokenPairFact(quote),
  ].filter((fact): fact is ToolFact => fact != null);

  return {
    id: "jupiter.swap.prepare",
    facts: uniqueFacts(facts),
    confidence: "high",
    rawLabel,
  };
};
