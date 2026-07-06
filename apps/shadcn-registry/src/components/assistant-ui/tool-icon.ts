import {
  ArrowRightLeftIcon,
  CableIcon,
  CoinsIcon,
  FlameIcon,
  FlaskConicalIcon,
  GlobeIcon,
  LayersIcon,
  PenLineIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  TrendingUpIcon,
  WalletIcon,
  WrenchIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Resolve the icon for a Working-trace step.
 *
 * Each tool call carries two signals: a natural-language `topic` (e.g. "Checking
 * USDC balance on Base") and the parsed `result` payload. The topic is friendly
 * but can be vague or even misleading — "Checking USDC balance on Base network"
 * actually returns a *chain-context* blob, not a balance; and "Checking USDC
 * balance" vs "…decimals" are two different `eth_call`s behind near-identical
 * wording. So we classify from the structured result first (high confidence),
 * fall back to keyword-matching the topic, and finally a generic wrench.
 *
 * To teach the resolver a new tool: add a `result` signal below if the payload
 * is distinctive, and/or a topic keyword row. This is the single place to grow.
 */

/** ERC-20 / common call selectors — the first 4 bytes of `tx.input`. */
const SELECTOR_ICONS: Record<string, LucideIcon> = {
  "0x70a08231": WalletIcon, // balanceOf(address)
  "0xa9059cbb": SendIcon, // transfer(address,uint256)
  "0x23b872dd": SendIcon, // transferFrom(address,address,uint256)
  "0x095ea7b3": PenLineIcon, // approve(address,uint256)
  "0xdd62ed3e": PenLineIcon, // allowance(address,address)
  "0x313ce567": CoinsIcon, // decimals()
  "0x95d89b41": CoinsIcon, // symbol()
  "0x06fdde03": CoinsIcon, // name()
  "0x18160ddd": CoinsIcon, // totalSupply()
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

/** High-confidence classification from the structured tool result. */
const iconFromResult = (result: unknown): LucideIcon | null => {
  const r = asRecord(result);
  if (!r) return null;

  // A raw contract call/read — key off the 4-byte selector.
  const tx = asRecord(r.tx);
  const input = typeof tx?.input === "string" ? tx.input : undefined;
  if (input && input.length >= 10) {
    const icon = SELECTOR_ICONS[input.slice(0, 10).toLowerCase()];
    if (icon) return icon;
  }

  // Skill activation: { activated, rejected, applied_scope }.
  if ("activated" in r || "applied_scope" in r) return SparklesIcon;
  // Chain-context fetch: { supported_chains, rpc_endpoint, block_number, … }.
  if ("supported_chains" in r || "rpc_endpoint" in r || "block_number" in r)
    return GlobeIcon;
  // Transaction simulation: { simulation, batch_success, … }.
  if ("simulation" in r || "batch_success" in r) return FlaskConicalIcon;
  // A staged tx queued for the batch: { current_lifecycle: "queued", … }.
  if (r.current_lifecycle === "queued") return LayersIcon;
  // A committed tx awaiting the wallet: { status: "pending_approval", tx_ids }.
  if (r.status === "pending_approval" || Array.isArray(r.tx_ids))
    return SendIcon;

  return null;
};

/** Keyword fallback, most-specific first; the leading action verb wins. */
const TOPIC_ICONS: ReadonlyArray<readonly [RegExp, LucideIcon]> = [
  [/simulat/, FlaskConicalIcon], // Simulating …
  [/^\s*stag|\bstage\b/, LayersIcon], // Staging …
  [/^\s*burn/, FlameIcon], // Burning …
  [/^\s*(send|commit|execute|submit|broadcast|transfer)/, SendIcon], // Committing …
  [/\bswap/, ArrowRightLeftIcon], // Swapping …
  [/^\s*bridg/, CableIcon], // Bridging …
  [/\b(sign|approv|allowance)/, PenLineIcon], // Signing / approving …
  [/\b(chain context|context|network|gas|block)\b/, GlobeIcon], // reading chain
  [/\b(balance|position|portfolio|holding|wallet)/, WalletIcon],
  [/\b(decimal|symbol|metadata|supply)/, CoinsIcon], // token facts
  [/\b(price|quote|market|value)/, TrendingUpIcon],
  [/\b(activat|skill)/, SparklesIcon],
  [/\b(search|find|look ?up|resolve|fetch|get|check|read)/, SearchIcon],
];

const iconFromTopic = (topic: string): LucideIcon | null => {
  const t = topic.toLowerCase();
  for (const [pattern, icon] of TOPIC_ICONS) {
    if (pattern.test(t)) return icon;
  }
  return null;
};

/**
 * Pick a step icon from the tool's result (preferred) then its topic wording,
 * falling back to a generic wrench.
 */
export const resolveToolIcon = (topic: string, result?: unknown): LucideIcon =>
  iconFromResult(result) ?? iconFromTopic(topic) ?? WrenchIcon;
