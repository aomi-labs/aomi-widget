"use client";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type BackendSystemEvent =
  | { InlineDisplay: unknown }
  | { SystemNotice: string }
  | { SystemError: string }
  | { AsyncUpdate: unknown };

export const isTempThreadId = (id: string) => id.startsWith("temp-");

export const isPlaceholderTitle = (title?: string) => {
  const normalized = title?.trim() ?? "";
  return !normalized || normalized.startsWith("#[");
};

export const parseTimestamp = (value?: string | number) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") {
    // Accept both ms and seconds since backend may send either.
    return Number.isFinite(value) ? (value < 1e12 ? value * 1000 : value) : 0;
  }

  // Numeric strings like "1725654321" are not parsed by Date.parse, so coerce first.
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }

  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};

export function normalizeWalletError(error: unknown): { rejected: boolean; message: string } {
  const e = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    shortMessage?: unknown;
    cause?: unknown;
  };
  const cause = (e?.cause ?? null) as
    | { code?: unknown; name?: unknown; message?: unknown; shortMessage?: unknown }
    | null;

  const code =
    (typeof e?.code === "number" ? e.code : undefined) ??
    (typeof cause?.code === "number" ? cause.code : undefined);
  const name =
    (typeof e?.name === "string" ? e.name : undefined) ??
    (typeof cause?.name === "string" ? cause.name : undefined);
  const msg =
    (typeof e?.shortMessage === "string" ? e.shortMessage : undefined) ??
    (typeof cause?.shortMessage === "string" ? cause.shortMessage : undefined) ??
    (typeof e?.message === "string" ? e.message : undefined) ??
    (typeof cause?.message === "string" ? cause.message : undefined) ??
    "Unknown wallet error";

  const rejected =
    code === 4001 ||
    name === "UserRejectedRequestError" ||
    name === "RejectedRequestError" ||
    /user rejected|rejected the request|denied|request rejected|canceled|cancelled/i.test(msg);

  return { rejected, message: msg };
}

export function parseBackendSystemEvent(value: unknown): BackendSystemEvent | null {
  if (!value || typeof value !== "object") return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) return null;
  const [key, payload] = entries[0];
  switch (key) {
    case "InlineDisplay":
      return { InlineDisplay: payload };
    case "SystemNotice":
      return { SystemNotice: typeof payload === "string" ? payload : String(payload) };
    case "SystemError":
      return { SystemError: typeof payload === "string" ? payload : String(payload) };
    case "AsyncUpdate":
      return { AsyncUpdate: payload };
    default:
      return null;
  }
}

export function toHexQuantity(value: string): string {
  const trimmed = value.trim();
  const asBigInt = BigInt(trimmed);
  return `0x${asBigInt.toString(16)}`;
}

export async function pickInjectedProvider(publicKey?: string): Promise<Eip1193Provider | undefined> {
  const ethereum = (globalThis as unknown as { ethereum?: unknown }).ethereum as
    | (Eip1193Provider & { providers?: unknown[] })
    | undefined;
  if (!ethereum?.request) return undefined;

  const candidates: Eip1193Provider[] = Array.isArray(ethereum.providers)
    ? (ethereum.providers.filter((p): p is Eip1193Provider => !!(p as Eip1193Provider)?.request) as Eip1193Provider[])
    : [ethereum];

  const target = publicKey?.toLowerCase();
  if (target) {
    for (const candidate of candidates) {
      try {
        const accounts = (await candidate.request({ method: "eth_accounts" })) as unknown;
        const list = Array.isArray(accounts) ? (accounts as unknown[]).map((a) => String(a).toLowerCase()) : [];
        if (list.includes(target)) return candidate;
      } catch {
        // Ignore providers that error on eth_accounts.
      }
    }
  }

  return candidates[0];
}
