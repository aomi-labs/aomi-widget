// Shared formatting helpers for the Operate pages.

export function secondsLabel(value: unknown) {
  const n = Number(value ?? 0);
  return n > 0 ? new Date(n * 1000).toLocaleString() : "";
}

export function clockLabel(value: unknown) {
  const n = Number(value ?? 0);
  return n > 0
    ? new Date(n * 1000).toLocaleTimeString([], { hour12: false })
    : "";
}

export function dayLabel(value: unknown) {
  const n = Number(value ?? 0);
  return n > 0
    ? new Date(n * 1000).toLocaleDateString([], { month: "short", day: "numeric" })
    : "";
}

/** Truncate 0x addresses / base58 signatures for dense table cells. */
export function truncateAddress(value: unknown, chars = 4): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.length <= chars * 2 + 2) return raw;
  return `${raw.slice(0, chars + 2)}…${raw.slice(-chars)}`;
}

export function valueLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "0") return "—";
  return raw;
}

export function numberLabel(value: unknown, digits = 1) {
  if (value === null || value === undefined || value === "") return "No data";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "No data";
}

export function percentLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "No data";
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "No data";
}

export function unitLabel(value: unknown, unit: string, digits = 1) {
  const label = numberLabel(value, digits);
  return label === "No data" ? label : `${label} ${unit}`;
}

export function countLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "No data";
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "No data";
}

export function tokensLabel(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : String(value ?? "");
}

export function bytesLabel(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  84532: "Base Sepolia",
  11155111: "Sepolia",
};

/** Backend-provided chain_name wins; otherwise map known ids, SVM → Solana. */
export function chainLabel(row: { chainName?: string | null; chainId?: number; family?: string | null }) {
  if (row.chainName) return row.chainName;
  if (row.family === "svm") return "Solana";
  const id = Number(row.chainId ?? 0);
  return CHAIN_NAMES[id] ?? (id ? String(id) : "—");
}
