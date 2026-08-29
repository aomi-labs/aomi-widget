import {
  CHAINS_BY_ID,
  parseChainId,
  type Action,
  type ActionRequest,
} from "@aomi-labs/client";
import { formatEther } from "viem";
import { mainnet, type Chain } from "viem/chains";

export function actionChain(action: Action | null): Chain {
  const chainId = action ? actionChainId(action) : undefined;
  return (chainId ? CHAINS_BY_ID[chainId] : undefined) ?? mainnet;
}

export function actionChainId(action: Action): number | undefined {
  if (action.request.type === "execute_evm") {
    return action.request.transactions[0]?.chain_id;
  }
  if (action.request.type !== "sign" || action.request.chainFamily !== "evm") {
    return undefined;
  }
  return parseChainId(action.request.chainId);
}

export type ActionField = {
  label: string;
  value: string;
  /** Render in a monospace, wrappable block — addresses, calldata, JSON. */
  mono?: boolean;
};

export type ActionSummary = {
  title: string;
  fields: ActionField[];
};

function formatCalldata(data: string | undefined): string {
  if (!data || data === "0x") return "None";
  return data;
}

/**
 * What the user is asked to approve, in the plainest terms we can state without
 * decoding. Nothing here is inferred — every field comes straight off the
 * request — because this is the only place a Telegram user sees what they are
 * signing.
 */
export function describeAction(
  action: Action,
  chain: Chain,
): ActionSummary | null {
  if (action.request.type === "execute_evm") {
    const transaction = action.request.transactions[0];
    const to = transaction?.to;
    const rawValue = transaction?.value ?? "0";
    const data = transaction?.data;

    let amount = `${rawValue} wei`;
    try {
      amount = `${formatEther(BigInt(rawValue))} ${chain.nativeCurrency.symbol}`;
    } catch {
      // Leave the raw value visible rather than hiding an unparseable amount.
    }

    const fields: ActionField[] = [
      { label: "Network", value: chain.name },
      { label: "To", value: to ?? "unknown", mono: true },
      { label: "Amount", value: amount },
      { label: "Calldata", value: formatCalldata(data), mono: true },
    ];
    if (transaction?.label) {
      fields.unshift({ label: "Action", value: transaction.label });
    }
    return { title: "Approve transaction", fields };
  }

  if (action.request.type !== "sign" || action.request.chainFamily !== "evm") {
    return null;
  }

  const request: Extract<ActionRequest, { type: "sign" }> = action.request;
  const fields: ActionField[] = [
    { label: "Network", value: chain.name },
    { label: "Signer", value: request.signer, mono: true },
  ];
  if (request.description) {
    fields.unshift({ label: "Action", value: request.description });
  }

  if (request.executor) {
    fields.push({
      label: "Executor",
      value: request.executor,
      mono: true,
    });
  }
  if (request.calls?.length) {
    fields.push({
      label: "Calls",
      value: JSON.stringify(request.calls, null, 2),
      mono: true,
    });
  }
  if (request.fees?.length) {
    fields.push({
      label: "Fees",
      value: JSON.stringify(request.fees, null, 2),
      mono: true,
    });
  }

  for (const [index, payload] of request.payloads.entries()) {
    const suffix = request.payloads.length > 1 ? ` ${index + 1}` : "";
    if (payload.kind === "evm_typed_data") {
      const typedData = payload.typed_data;
      if (typedData.primaryType) {
        fields.push({ label: `Type${suffix}`, value: typedData.primaryType });
      }
      fields.push({
        label: `Domain${suffix}`,
        value: JSON.stringify(typedData.domain ?? {}, null, 2),
        mono: true,
      });
      fields.push({
        label: `Types${suffix}`,
        value: JSON.stringify(typedData.types ?? {}, null, 2),
        mono: true,
      });
      fields.push({
        label: `Message${suffix}`,
        value: JSON.stringify(typedData.message ?? {}, null, 2),
        mono: true,
      });
      continue;
    }
    if (payload.kind === "evm_personal") {
      fields.push({
        label: `Message${suffix}`,
        value: payload.message,
        mono: true,
      });
    }
  }

  return {
    title:
      request.executionKind === "erc4337"
        ? "Approve account action"
        : "Approve signature",
    fields,
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "action_failed";
}
