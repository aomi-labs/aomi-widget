import { SUPPORTED_CHAIN_IDS, CHAIN_NAMES } from "../chains";
import { fatal } from "./errors";

export function parseChainId(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return undefined;
  if (!(SUPPORTED_CHAIN_IDS as readonly number[]).includes(n)) {
    const list = SUPPORTED_CHAIN_IDS.map(
      (id) => `  ${id} (${CHAIN_NAMES[id]})`,
    ).join("\n");
    fatal(`Unsupported chain ID: ${n}\nSupported chains:\n${list}`);
  }
  return n;
}

export function normalizePrivateKey(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}
