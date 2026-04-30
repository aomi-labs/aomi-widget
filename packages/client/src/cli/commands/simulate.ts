import { AomiClient } from "../../client";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { DIM, GREEN, RESET } from "../output";

export async function simulateCommand(txIds: string[]): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }

  if (txIds.length === 0) {
    fatal("Usage: aomi tx simulate <tx-id> [<tx-id> ...]\nRun `aomi tx list` to see available IDs.");
  }

  const session = cli.createClientSession();
  try {
    const apiState = await session.client.fetchState(
      cli.sessionId,
      undefined,
      cli.clientId,
    );
    cli.syncPendingFromUserState(apiState.user_state);
  } finally {
    session.close();
  }

  // Resolve tx IDs to local pending tx payloads.
  const pendingTxs = txIds.map((txId) => cli.requirePendingTx(txId));

  console.log(
    `${DIM}Simulating ${txIds.length} transaction(s) as atomic batch...${RESET}`,
  );

  const client = new AomiClient({
    baseUrl: cli.baseUrl,
    apiKey: cli.apiKey,
  });

  const transactions = pendingTxs.map((tx) => ({
    to: tx.to ?? "",
    value: tx.value,
    data: tx.data,
    label: tx.description ?? tx.id,
    chain_id: tx.chainId ?? cli.chainId,
  }));

  const response = await client.simulateBatch(
    cli.sessionId,
    transactions,
    {
      from: cli.publicKey ?? undefined,
      chainId: cli.chainId ?? undefined,
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
      `${GREEN}All steps passed.${RESET} Run \`aomi tx sign ${txIds.join(" ")}\` to execute.`,
    );
  } else {
    const failed = result.steps.find((s) => !s.success);
    console.log(
      `\x1b[31mBatch failed at step ${failed?.step ?? "?"}.${RESET} Fix the issue and re-queue, or run \`aomi tx sign\` on the successful prefix.`,
    );
  }
}
