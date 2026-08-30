import { formatEther } from "viem";
import type { Action } from "../../agent/types";
import { CliSession } from "../cli-session";
import { createCliClient } from "../client-factory";
import { fatal } from "../errors";
import { DIM, GREEN, RESET } from "../output";
import type { CliConfig } from "../types";

export async function simulateCommand(
  config: CliConfig,
  selectors: string[],
): Promise<void> {
  const cli = CliSession.load();
  if (!cli) fatal("No active session. Run `aomi chat` first.");
  if (selectors.length === 0) {
    fatal(
      "Usage: aomi tx simulate <action-id> [<action-id> ...]\nRun `aomi tx list` to see pending Actions.",
    );
  }

  const session = cli.createClientSession(config);
  let actions: Action[];
  try {
    await session.fetchCurrentState();
    const pending = session.actions.pending();
    actions = selectors.map((selector) => resolveAction(pending, selector));
  } finally {
    session.close();
  }
  const transactions = actions.flatMap((action) => {
    if (action.request.type !== "execute_evm") {
      fatal(`Action "${action.id}" is not an EVM execution Action.`);
    }
    return action.request.transactions.map((transaction) => ({
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
      label: transaction.label,
      chain_id: transaction.chain_id,
    }));
  });

  console.log(
    `${DIM}Simulating ${transactions.length} transaction(s) as an atomic batch...${RESET}`,
  );
  const client = createCliClient(
    { ...config, secrets: config.secrets ?? {} },
    { baseUrl: cli.baseUrl, apiKey: cli.apiKey },
  );
  const { result } = await client.simulateBatch(cli.sessionId, transactions, {
    from: cli.publicKey,
    chainId: cli.chainId,
  });

  const mode = result.stateful
    ? "stateful (Anvil snapshot)"
    : "stateless (independent eth_call)";
  console.log(`\nBatch simulation (${mode}):`);
  console.log(`From: ${result.from} | Network: ${result.network}\n`);
  for (const step of result.steps) {
    const icon = step.success ? `${GREEN}✓${RESET}` : `\x1b[31m✗${RESET}`;
    const gas = step.gas_used
      ? ` | gas: ${step.gas_used.toLocaleString()}`
      : "";
    console.log(`  ${icon} ${step.step}. ${step.label || `Step ${step.step}`}`);
    console.log(
      `    ${DIM}to: ${step.tx.to} | value: ${step.tx.value_eth} ETH${gas}${RESET}`,
    );
    if (!step.success && step.revert_reason) {
      console.log(`    \x1b[31mRevert: ${step.revert_reason}${RESET}`);
    }
  }
  if (result.total_gas) {
    console.log(
      `\n${DIM}Total gas: ${result.total_gas.toLocaleString()}${RESET}`,
    );
  }
  if (result.fee) {
    const amount = BigInt(result.fee.amount_wei);
    console.log(
      `Service fee: ${formatEther(amount)} ETH (${amount} wei) → ${result.fee.recipient}`,
    );
  }
  console.log(
    result.batch_success
      ? `\n${GREEN}All steps passed.${RESET}`
      : `\n\x1b[31mBatch failed.${RESET}`,
  );
}

function resolveAction(actions: Action[], selector: string): Action {
  const matches = actions.filter(
    (action) => action.id === selector || action.id.startsWith(selector),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) fatal(`Action selector "${selector}" is ambiguous.`);
  fatal(`Pending Action "${selector}" was not found.`);
}
