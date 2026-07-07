import {
  chainFact,
  asRecord,
  asString,
  topicTokenFact,
  tokenFact,
  uniqueFacts,
} from "./normalize";
import {
  matchChainContext,
  matchError,
  matchNativeBalance,
  matchSkillActivation,
  matchTokenLookup,
  matchWebSearch,
} from "./families/simple";
import {
  matchPendingApproval,
  matchSimulation,
  matchStagedTx,
} from "./families/evm-tx";
import { matchEvmCall } from "./families/evm-call";
import { presentOperation } from "./present";
import type {
  InterpretedToolStep,
  ToolConfidence,
  ToolContext,
  ToolMatcher,
} from "./types";

const matchers: ToolMatcher[] = [
  matchWebSearch,
  matchSkillActivation,
  matchChainContext,
  matchNativeBalance,
  matchTokenLookup,
  matchStagedTx,
  matchSimulation,
  matchPendingApproval,
  matchEvmCall,
  matchError,
];

const fallbackOperation = (ctx: ToolContext) => {
  const args = asRecord(ctx.parsedArgs);
  const symbol = asString(args?.symbol);
  const facts = uniqueFacts(
    [
      topicTokenFact(ctx.rawLabel),
      chainFact(args?.chain_id, args?.chain_name, "args"),
      symbol ? tokenFact(symbol, "args") : null,
    ].filter((fact): fact is NonNullable<typeof fact> => fact != null),
  );

  const confidence: ToolConfidence = facts.length > 0 ? "medium" : "fallback";

  return {
    id: "fallback",
    facts,
    confidence,
    rawLabel: ctx.rawLabel,
  };
};

export const interpretToolContext = (ctx: ToolContext): InterpretedToolStep => {
  const operation =
    matchers.reduce<ReturnType<ToolMatcher>>(
      (matched, matcher) => matched ?? matcher(ctx),
      null,
    ) ?? fallbackOperation(ctx);

  return presentOperation(operation);
};
