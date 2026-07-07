import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BanIcon,
  BlocksIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CoinsIcon,
  FuelIcon,
  PuzzleIcon,
  ReceiptTextIcon,
  UserIcon,
} from "lucide-react";

import { getChainIcon } from "@/components/icons/chain-map";
import {
  SHAPE_ICONS,
  STAGED_ACTION_ICON_REGISTRY,
} from "@/components/assistant-ui/tool-registry";

import { humanize } from "../normalize";
import type { ToolChip, ToolFact } from "../types";

const formatInteger = (value: string): string => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString("en-US") : value;
};

const shortenAddress = (address: string): string =>
  /^0x[a-fA-F0-9]{40}$/.test(address)
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

const statusChip = (value: string): ToolChip => {
  switch (value) {
    case "queued":
      return { label: "Queued", icon: ClockIcon };
    case "pending":
      return { label: "Pending approval", icon: ClockIcon };
    case "success":
      return { label: "Success", icon: CircleCheckIcon };
    case "failed":
    case "error":
      return { label: "Failed", icon: CircleXIcon };
    case "revoked":
      return { label: "Revoked", icon: BanIcon };
    default:
      return { label: humanize(value) };
  }
};

const stagedActionIcon = (value: string) => {
  const lower = value.toLowerCase().replace(/[_-]+/g, " ");
  for (const [pattern, icon] of STAGED_ACTION_ICON_REGISTRY) {
    if (pattern.test(lower)) return icon;
  }
  return SHAPE_ICONS.staged;
};

export const chipForFact = (fact: ToolFact): ToolChip | null => {
  switch (fact.kind) {
    case "action":
      return {
        label: fact.label ?? humanize(fact.value),
        icon: stagedActionIcon(fact.value),
      };
    case "address":
      if (fact.role === "owner") {
        return { label: shortenAddress(fact.value), icon: UserIcon };
      }
      if (fact.role === "from") {
        return { label: shortenAddress(fact.value), icon: ArrowUpRightIcon };
      }
      if (
        fact.role === "recipient" ||
        fact.role === "spender" ||
        fact.role === "to"
      ) {
        return { label: shortenAddress(fact.value), icon: ArrowDownLeftIcon };
      }
      return { label: shortenAddress(fact.value) };
    case "amount":
      return { label: fact.label ?? fact.value };
    case "block":
      return { label: formatInteger(fact.value), icon: BlocksIcon };
    case "chain": {
      const chainId = Number(fact.value);
      return {
        label: fact.label ?? fact.value,
        icon: Number.isFinite(chainId) ? getChainIcon(chainId) : undefined,
      };
    }
    case "code":
      return { label: fact.label ?? fact.value };
    case "count":
      if (fact.role === "tx") {
        const count = Number(fact.value);
        return {
          label: `${fact.value} tx${count === 1 ? "" : "s"}`,
          icon: ReceiptTextIcon,
        };
      }
      if (fact.role === "results") {
        return { label: `${fact.value} results` };
      }
      return { label: fact.value };
    case "decoded":
      return { label: fact.label ?? fact.value };
    case "gas":
      return { label: `${formatInteger(fact.value)} gas`, icon: FuelIcon };
    case "selector":
      return { label: fact.label ?? fact.value };
    case "skill":
      return { label: fact.label ?? humanize(fact.value), icon: PuzzleIcon };
    case "sourceHost":
      return { label: fact.label ?? fact.value };
    case "status":
      return statusChip(fact.value);
    case "token":
      return { label: fact.label ?? fact.value, icon: CoinsIcon };
    case "txId":
      return { label: fact.value, icon: ReceiptTextIcon };
    default:
      return null;
  }
};

export const uniqueChips = (chips: ToolChip[]): ToolChip[] => {
  const seen = new Set<string>();
  return chips.filter((chip) => {
    const key = chip.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
