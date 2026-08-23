import { getAddress, type Address } from "viem";
import { CliSession } from "../cli-session";
import { toEip5792SendCallsParams } from "../eip5792";
import { fatal } from "../errors";
import type { PendingTx } from "../state";
import { pendingTxToCallList } from "../transactions";
import type { CliConfig } from "../types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeSender(value: string, label: string): Address {
  try {
    return getAddress(value);
  } catch {
    throw new Error(`${label} is not a valid EVM address.`);
  }
}

function resolvePendingEvmTransactions(
  cli: CliSession,
  selectors: readonly string[],
): PendingTx[] {
  const pending = selectors.map((selector) => {
    const evm = cli.findPendingTx(selector);
    const svm = cli.findPendingSolTx(selector);

    if (!selector.includes(":") && evm && svm) {
      throw new Error(
        `Transaction "${selector}" is ambiguous. Use the chain-qualified selector shown by \`aomi tx list\`.`,
      );
    }
    if (!evm && svm) {
      throw new Error(
        `Transaction "${selector}" is a Solana request; EIP-5792 export supports pending EVM transactions only.`,
      );
    }
    if (!evm) {
      const available = cli.pendingSelectors().join(", ") || "(none)";
      throw new Error(
        `Transaction "${selector}" not found.\nAvailable: ${available}`,
      );
    }
    if (evm.kind !== "transaction") {
      throw new Error(
        `Transaction "${selector}" is an EVM signing request; EIP-5792 export supports transaction calls only.`,
      );
    }
    return evm;
  });

  if (new Set(pending.map((tx) => tx.id)).size !== pending.length) {
    throw new Error(
      "Duplicate transaction IDs are not allowed in a single `aomi tx export` call.",
    );
  }
  return pending;
}

function resolveSender(
  pending: readonly PendingTx[],
  sessionSender: string | undefined,
): Address {
  const normalizedSessionSender = sessionSender
    ? normalizeSender(sessionSender, "The active session sender")
    : undefined;
  const senders = pending.map((tx) => {
    const stagedSender = tx.from
      ? normalizeSender(tx.from, `Transaction "${tx.id}" sender`)
      : undefined;
    if (
      stagedSender &&
      normalizedSessionSender &&
      stagedSender.toLowerCase() !== normalizedSessionSender.toLowerCase()
    ) {
      throw new Error(
        `Transaction "${tx.id}" sender ${stagedSender} does not match the active session sender ${normalizedSessionSender}.`,
      );
    }
    const sender = stagedSender ?? normalizedSessionSender;
    if (!sender) {
      throw new Error(
        `Transaction "${tx.id}" has no sender and the active session has no EVM address.`,
      );
    }
    return sender;
  });

  if (new Set(senders.map((sender) => sender.toLowerCase())).size !== 1) {
    throw new Error("Selected transactions must use one sender.");
  }
  return senders[0];
}

function resolveChainIds(
  pending: readonly PendingTx[],
  sessionChainId: number | undefined,
): number[] {
  const chainIds = pending.map((tx) => {
    const chainId = tx.chainId ?? sessionChainId;
    if (!Number.isSafeInteger(chainId) || (chainId ?? 0) <= 0) {
      throw new Error(
        `Transaction "${tx.id}" has no valid chain ID; export will not default to Ethereum.`,
      );
    }
    return chainId as number;
  });
  if (new Set(chainIds).size !== 1) {
    throw new Error("Selected transactions must use one chain.");
  }
  return chainIds;
}

export async function exportCommand(
  config: CliConfig,
  txIds: string[],
): Promise<void> {
  if (txIds.length === 0) {
    fatal(
      "Usage: aomi tx export <tx-id> [<tx-id> ...]\nRun `aomi tx list` to see pending transaction IDs.",
    );
  }

  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }

  cli.mergeConfig(config);
  const session = cli.createClientSession(config);
  try {
    const state = await session.client.fetchState(
      cli.sessionId,
      undefined,
      cli.clientId,
    );
    cli.syncPendingFromUserState(state.user_state);
  } finally {
    session.close();
  }

  try {
    const pending = resolvePendingEvmTransactions(cli, txIds);
    const sender = resolveSender(pending, cli.publicKey);
    const chainIds = resolveChainIds(pending, cli.chainId);
    const calls = pending.flatMap((tx, index) =>
      pendingTxToCallList({ ...tx, chainId: chainIds[index] }),
    );
    const payload = toEip5792SendCallsParams({
      from: sender,
      chainId: chainIds[0],
      calls,
    });
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } catch (error) {
    fatal(errorMessage(error));
  }
}
