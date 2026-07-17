import { asInteger, asString, uniqueFacts } from "../normalize";
import type { ToolFact, ToolMatcher } from "../types";

export const svmClusterFact = (
  value: unknown,
  fallback = "mainnet-beta",
): ToolFact => {
  const cluster = asString(value) ?? fallback;
  return {
    kind: "cluster",
    value: cluster,
    // The network selector already shows Solana / Devnet / Testnet. Keep the
    // working trace focused on the chain family and use the slot for context.
    label: "Solana",
    source: "result",
  };
};

export const matchSvmContext: ToolMatcher = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  const slot = asInteger(resultRecord.current_slot);
  const cluster = asString(resultRecord.cluster);
  const supportedClusters = resultRecord.supported_clusters;
  if (!cluster || (slot == null && !Array.isArray(supportedClusters))) {
    return null;
  }

  return {
    id: "svm.context",
    facts: uniqueFacts([
      svmClusterFact(cluster),
      ...(slot == null
        ? []
        : [
            {
              kind: "slot" as const,
              value: String(slot),
              source: "result" as const,
            },
          ]),
    ]),
    confidence: "high",
    rawLabel,
  };
};
