import {
  asRecord,
  asString,
  statusFact,
  txOutcomeStatus,
  uniqueFacts,
} from "../normalize";
import type { ToolFact, ToolMatcher, ToolOperation } from "../types";
import { svmClusterFact } from "./svm";

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

const txCountFact = (ids: unknown): ToolFact | null =>
  Array.isArray(ids) && ids.length > 0
    ? {
        kind: "count",
        role: "tx",
        value: String(ids.length),
        source: "result",
      }
    : null;

const isSvmSimulation = (
  result: Record<string, unknown>,
  simulation: Record<string, unknown> | null,
): boolean => {
  if (result.chain_kind === "svm") return true;
  if (!Array.isArray(result.ix_ids)) return false;

  const batchStatus = asString(result.last_batch_status)?.toLowerCase();
  return Boolean(
    batchStatus?.includes("svm") ||
    simulation?.units_consumed != null ||
    Array.isArray(simulation?.logs),
  );
};

export const matchSvmSimulation: ToolMatcher = ({ rawLabel, resultRecord }) => {
  if (!resultRecord) return null;
  const simulation = asRecord(resultRecord.simulation);
  if (!simulation || !isSvmSimulation(resultRecord, simulation)) return null;

  const simulationStatus =
    "err" in simulation
      ? simulation.err == null
      : resultRecord.last_batch_status;

  return op("svm.tx.simulate_batch", rawLabel, [
    txCountFact(resultRecord.ix_ids),
    statusFact(simulationStatus),
  ]);
};

export const matchSvmPendingApproval: ToolMatcher = ({
  rawLabel,
  parsedArgs,
  resultRecord,
  relatedResultRecords,
}) => {
  if (
    !resultRecord ||
    !(
      resultRecord.chain_kind === "svm" ||
      Array.isArray(resultRecord.svm_ix_ids)
    ) ||
    resultRecord.status !== "pending_approval"
  ) {
    return null;
  }

  const args = asRecord(parsedArgs);
  const txIds = Array.isArray(resultRecord.svm_ix_ids)
    ? resultRecord.svm_ix_ids
    : Array.isArray(args?.svm_ix_ids)
      ? args.svm_ix_ids
      : [];
  const relatedCluster = [...relatedResultRecords]
    .reverse()
    .map((record) => asString(record.cluster))
    .find((cluster) => cluster != null);
  const cluster =
    asString(resultRecord.cluster) ?? asString(args?.cluster) ?? relatedCluster;
  const outcome = asRecord(resultRecord.tx_outcome);
  const txHash = asString(outcome?.txHash);

  // "pending_approval" is frozen at staging time; the wallet's actual verdict
  // arrives later via wallet::solana_*_complete and is reconciled onto the
  // result as `tx_outcome` — prefer it, same contract as the EVM family.
  return op("svm.tx.pending_approval", rawLabel, [
    svmClusterFact(cluster),
    txCountFact(txIds),
    txHash
      ? {
          kind: "txId",
          value: txHash,
          source: "result",
        }
      : null,
    statusFact(txOutcomeStatus(resultRecord) ?? resultRecord.status),
  ]);
};
