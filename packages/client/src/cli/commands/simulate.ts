import { AomiClient } from "../../client";
import { fatal } from "../errors";
import { DIM, GREEN, RESET } from "../output";
import { readState, type CliSessionState } from "../state";

function requirePendingTx(state: CliSessionState, txId: string) {
  const pendingTx = (state.pendingTxs ?? []).find((tx) => tx.id === txId);
  if (!pendingTx) {
    fatal(
      `No pending transaction with id "${txId}".\nRun \`aomi tx\` to see available IDs.`,
    );
  }
  return pendingTx;
}

export async function simulateCommand(txIds: string[]): Promise<void> {
  const state = readState();
  if (!state) {
    fatal("No active session. Run `aomi chat` first.");
  }

  if (txIds.length === 0) {
    fatal("Usage: aomi simulate <tx-id> [<tx-id> ...]\nRun `aomi tx` to see available IDs.");
  }

  // Resolve tx IDs to local pending tx payloads.
  const pendingTxs = txIds.map((txId) => requirePendingTx(state, txId));

  console.log(
    `${DIM}Simulating ${txIds.length} transaction(s) as atomic batch...${RESET}`,
  );

  const client = new AomiClient({
    baseUrl: state.baseUrl,
    apiKey: state.apiKey,
  });

  const transactions = pendingTxs.map((tx) => ({
    to: tx.to,
    value: tx.value,
    data: tx.data,
    label: tx.description ?? tx.id,
  }));

  const response = await client.simulateBatch(
    state.sessionId,
    transactions,
    {
      from: state.publicKey ?? undefined,
      chainId: state.chainId ?? undefined,
    },
  );
  const { result } = response;

  // Print header.
  const modeLabel = result.stateful ? "stateful (Anvil snapshot)" : "stateless (independent eth_call)";
  console.log(`\nBatch simulation (${modeLabel}):`);
  console.log(`From: ${result.from} | Network: ${result.network}\n`);

  // Print per-step results.
  for (const step of result.steps) {
    const icon = step.success ? `${GREEN}✓${RESET}` : `\x1b[31m✗${RESET}`;
    const label = step.label || `Step ${step.step}`;
    const gasInfo = step.gas_used ? ` | gas: ${step.gas_used.toLocaleString()}` : "";
    console.log(`  ${icon} ${step.step}. ${label}`);
    console.log(`    ${DIM}to: ${step.tx.to} | value: ${step.tx.value_eth} ETH${gasInfo}${RESET}`);
    if (!step.success && step.revert_reason) {
      console.log(`    \x1b[31mRevert: ${step.revert_reason}${RESET}`);
    }
  }

  // Print gas and fee summary.
  if (result.total_gas) {
    console.log(`\n${DIM}Total gas: ${result.total_gas.toLocaleString()}${RESET}`);
  }
  if (result.fee) {
    const feeEth = (Number(result.fee.amount_wei) / 1e18).toFixed(6);
    console.log(
      `Service fee: ${feeEth} ETH → ${result.fee.recipient}`,
    );
  }

  // Print summary.
  console.log();
  if (result.batch_success) {
    console.log(
      `${GREEN}All steps passed.${RESET} Run \`aomi sign ${txIds.join(" ")}\` to execute.`,
    );
  } else {
    const failed = result.steps.find((s) => !s.success);
    console.log(
      `\x1b[31mBatch failed at step ${failed?.step ?? "?"}.${RESET} Fix the issue and re-queue, or run \`aomi sign\` on the successful prefix.`,
    );
  }
}
